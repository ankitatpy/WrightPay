import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;

  beforeEach(async () => {
    authService = {
      signup: jest.fn().mockResolvedValue({ message: 'Signup successful. Please verify your email.', userId: 'u-1' }),
      login: jest.fn().mockResolvedValue({ access_token: 'jwt.token', user: { id: 'u-1', email: 'test@example.com' } }),
      verifyEmail: jest.fn().mockResolvedValue({ message: 'Email successfully verified' }),
      logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate signup to authService.signup', async () => {
    const signupDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123!',
      agreeTerms: true,
    };
    const result = await controller.signup(signupDto);
    expect(authService.signup).toHaveBeenCalledWith(signupDto);
    expect(result).toEqual({ message: 'Signup successful. Please verify your email.', userId: 'u-1' });
  });

  it('should delegate login to authService.login', async () => {
    const loginDto = { email: 'john@example.com', password: 'Password123!' };
    const result = await controller.login(loginDto);
    expect(authService.login).toHaveBeenCalledWith(loginDto);
    expect(result.access_token).toBe('jwt.token');
  });

  it('should delegate verifyEmail to authService.verifyEmail', async () => {
    const verifyDto = { email: 'john@example.com', code: '123456' };
    const result = await controller.verifyEmail(verifyDto);
    expect(authService.verifyEmail).toHaveBeenCalledWith(verifyDto);
    expect(result.message).toBe('Email successfully verified');
  });

  it('should delegate logout to authService.logout', async () => {
    const result = await controller.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(result.message).toBe('Logged out successfully');
  });
});
