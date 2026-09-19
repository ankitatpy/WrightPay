import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { User, AccountStatus, KycStatus, AccountType } from '../users/entities/user.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Currency } from '../../core/enums/currency.enum';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailVerificationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWalletRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(EmailVerification),
          useValue: mockEmailVerificationRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    const signupDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      agreeTerms: true,
    };

    it('should throw BadRequestException if email is already in use', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({ id: 'existing-id', email: 'john.doe@example.com' });

      await expect(service.signup(signupDto)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' },
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create user, default EUR wallet, and verification record on valid signup', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      (argon2.hash as jest.Mock).mockResolvedValueOnce('hashed_password');

      const createdUser = {
        id: 'new-user-id',
        name: 'John Doe',
        email: 'john.doe@example.com',
        passwordHash: 'hashed_password',
        accountStatus: AccountStatus.PENDING,
        kycStatus: KycStatus.NOT_STARTED,
        defaultCurrency: Currency.EUR,
        accountType: AccountType.INDIVIDUAL,
      };
      mockUserRepository.create.mockReturnValueOnce(createdUser);
      mockUserRepository.save.mockResolvedValueOnce(createdUser);

      const createdWallet = {
        id: 'new-wallet-id',
        user: createdUser,
        currency: Currency.EUR,
        balance: 0,
        isDefault: true,
      };
      mockWalletRepository.create.mockReturnValueOnce(createdWallet);
      mockWalletRepository.save.mockResolvedValueOnce(createdWallet);

      const createdVerification = {
        id: 'verif-id',
        email: 'john.doe@example.com',
        verificationCode: '123456',
        isVerified: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
      mockEmailVerificationRepository.create.mockReturnValueOnce(createdVerification);
      mockEmailVerificationRepository.save.mockResolvedValueOnce(createdVerification);

      const result = await service.signup(signupDto);

      expect(argon2.hash).toHaveBeenCalledWith('SecurePassword123!');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
        passwordHash: 'hashed_password',
        accountStatus: AccountStatus.PENDING,
        kycStatus: KycStatus.NOT_STARTED,
        defaultCurrency: Currency.EUR,
        accountType: AccountType.INDIVIDUAL,
      });
      expect(mockWalletRepository.create).toHaveBeenCalledWith({
        user: createdUser,
        currency: Currency.EUR,
        balance: 0,
        isDefault: true,
      });
      expect(result).toEqual({
        message: 'Signup successful. Please verify your email.',
        userId: 'new-user-id',
      });
    });

    it('should trim and lowercase user email on signup', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      (argon2.hash as jest.Mock).mockResolvedValueOnce('hashed_password');

      mockUserRepository.create.mockImplementation((dto) => ({ id: 'u1', ...dto }));
      mockUserRepository.save.mockImplementation((u) => Promise.resolve(u));
      mockWalletRepository.create.mockReturnValue({});
      mockWalletRepository.save.mockResolvedValue({});
      mockEmailVerificationRepository.create.mockReturnValue({});
      mockEmailVerificationRepository.save.mockResolvedValue({});

      await service.signup({
        firstName: 'Jane',
        lastName: 'Smith',
        email: '  JANE.Smith@Example.COM  ',
        password: 'Password123!',
        agreeTerms: true,
      });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane.smith@example.com',
          name: 'Jane Smith',
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'MyPassword123!',
    };

    it('should throw UnauthorizedException(INVALID_CREDENTIALS) if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('INVALID_CREDENTIALS'),
      );
    });

    it('should throw UnauthorizedException(INVALID_CREDENTIALS) if password is wrong', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        accountStatus: AccountStatus.ACTIVE,
        name: 'Test User',
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('INVALID_CREDENTIALS'),
      );
    });

    it('should throw UnauthorizedException(ACCOUNT_SUSPENDED) if account is suspended', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        accountStatus: AccountStatus.SUSPENDED,
        name: 'Test User',
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('ACCOUNT_SUSPENDED'),
      );
    });

    it('should throw UnauthorizedException(ACCOUNT_CLOSED) if account is closed', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        accountStatus: AccountStatus.CLOSED,
        name: 'Test User',
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('ACCOUNT_CLOSED'),
      );
    });

    it('should return access token and user info on valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        accountStatus: AccountStatus.ACTIVE,
        name: 'Test User',
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);
      mockJwtService.signAsync.mockResolvedValueOnce('mocked.jwt.token');

      const result = await service.login(loginDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'user@example.com',
      });
      expect(result).toEqual({
        access_token: 'mocked.jwt.token',
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
        },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException(INVALID_INPUT) if verification record not found', async () => {
      mockEmailVerificationRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.verifyEmail({ email: 'unknown@example.com', code: '000000' }),
      ).rejects.toThrow(new BadRequestException('INVALID_INPUT'));
    });

    it('should throw BadRequestException if email is already verified', async () => {
      mockEmailVerificationRepository.findOne.mockResolvedValueOnce({
        id: 'v1',
        email: 'user@example.com',
        verificationCode: '123456',
        isVerified: true,
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        service.verifyEmail({ email: 'user@example.com', code: '123456' }),
      ).rejects.toThrow(new BadRequestException('Email is already verified'));
    });

    it('should throw BadRequestException if code is expired', async () => {
      mockEmailVerificationRepository.findOne.mockResolvedValueOnce({
        id: 'v1',
        email: 'user@example.com',
        verificationCode: '123456',
        isVerified: false,
        expiresAt: new Date(Date.now() - 10000), // Expired
      });

      await expect(
        service.verifyEmail({ email: 'user@example.com', code: '123456' }),
      ).rejects.toThrow(new BadRequestException('Verification code expired'));
    });

    it('should mark verification as true and transition user from PENDING to ACTIVE', async () => {
      const verification = {
        id: 'v1',
        email: 'user@example.com',
        verificationCode: '123456',
        isVerified: false,
        expiresAt: new Date(Date.now() + 60000),
      };
      mockEmailVerificationRepository.findOne.mockResolvedValueOnce(verification);

      const user = {
        id: 'user-1',
        email: 'user@example.com',
        accountStatus: AccountStatus.PENDING,
      };
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.verifyEmail({ email: 'user@example.com', code: '123456' });

      expect(verification.isVerified).toBe(true);
      expect(mockEmailVerificationRepository.save).toHaveBeenCalledWith(verification);
      expect(user.accountStatus).toBe(AccountStatus.ACTIVE);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual({ message: 'Email successfully verified' });
    });
  });

  describe('logout', () => {
    it('should return logout success message', async () => {
      const result = await service.logout();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
