import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User, AccountStatus, KycStatus, AccountType } from '../users/entities/user.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Currency } from '../../core/enums/currency.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { firstName, lastName, email, password } = signupDto;

    const existingUser = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(password);

    const user = this.userRepository.create({
      name: `${firstName} ${lastName}`.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      accountStatus: AccountStatus.PENDING,
      kycStatus: KycStatus.NOT_STARTED,
      defaultCurrency: Currency.EUR,
      accountType: AccountType.INDIVIDUAL,
    });

    await this.userRepository.save(user);

    const wallet = this.walletRepository.create({
      user,
      currency: Currency.EUR,
      balance: 0,
      isDefault: true,
    });

    await this.walletRepository.save(wallet);

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

    // In dev, use a fixed one if needed or just output it. Let's create it.
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const verification = this.emailVerificationRepository.create({
      email: user.email,
      verificationCode: process.env.NODE_ENV === 'development' ? '123456' : otp,
      isVerified: false,
      expiresAt,
    });

    await this.emailVerificationRepository.save(verification);

    return {
      message: 'Signup successful. Please verify your email.',
      userId: user.id,
      // Ideally we don't return the OTP, but for dev purposes or the assignment we can log it
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        accountStatus: true,
        name: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException('ACCOUNT_SUSPENDED');
    }

    if (user.accountStatus === AccountStatus.CLOSED) {
      throw new UnauthorizedException('ACCOUNT_CLOSED');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;

    const verification = await this.emailVerificationRepository.findOne({
      where: { email: email.toLowerCase().trim(), verificationCode: code },
      order: { createdAt: 'DESC' }
    });

    if (!verification) {
      throw new BadRequestException('INVALID_INPUT');
    }

    if (verification.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (new Date() > verification.expiresAt) {
      throw new BadRequestException('Verification code expired');
    }

    verification.isVerified = true;
    await this.emailVerificationRepository.save(verification);

    // Update user status
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase().trim() } });
    if (user && user.accountStatus === AccountStatus.PENDING) {
      user.accountStatus = AccountStatus.ACTIVE;
      await this.userRepository.save(user);
    }

    return { message: 'Email successfully verified' };
  }

  async logout() {
    // Basic JWT doesn't support server-side logout without a token blacklist (Redis).
    // The client just deletes the token.
    return { message: 'Logged out successfully' };
  }
}
