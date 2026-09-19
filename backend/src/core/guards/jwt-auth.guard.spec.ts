import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };
    guard = new JwtAuthGuard(jwtService as JwtService, configService as ConfigService);
  });

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if header does not start with Bearer', async () => {
    const context = createMockContext({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if token string is empty', async () => {
    const context = createMockContext({ authorization: 'Bearer ' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if jwtService.verifyAsync rejects', async () => {
    const context = createMockContext({ authorization: 'Bearer invalid.or.expired.jwt' });
    (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('Invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid.or.expired.jwt', {
      secret: 'test-jwt-secret',
    });
  });

  it('should attach user id and email to request and return true on valid token', async () => {
    const requestObj: any = {
      headers: { authorization: 'Bearer valid.jwt.token' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => requestObj,
      }),
    } as unknown as ExecutionContext;

    (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
      sub: 'user-uuid-123',
      email: 'alex@example.com',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(requestObj.user).toEqual({
      id: 'user-uuid-123',
      email: 'alex@example.com',
    });
  });
});
