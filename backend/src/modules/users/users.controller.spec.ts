import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<Partial<UsersService>>;

  const mockUserProfile = {
    id: 'user-123',
    email: 'alex@example.com',
    name: 'Alex Wright',
  };

  beforeEach(async () => {
    usersService = {
      getMe: jest.fn().mockResolvedValue(mockUserProfile),
      updateMe: jest.fn().mockResolvedValue({ ...mockUserProfile, name: 'Alex Updated' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getMe to usersService.getMe with current user ID', async () => {
    const result = await controller.getMe({ id: 'user-123', email: 'alex@example.com' });
    expect(usersService.getMe).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(mockUserProfile);
  });

  it('should delegate updateMe to usersService.updateMe with user ID and DTO', async () => {
    const updateDto = { name: 'Alex Updated' };
    const result = await controller.updateMe(
      { id: 'user-123', email: 'alex@example.com' },
      updateDto,
    );
    expect(usersService.updateMe).toHaveBeenCalledWith('user-123', updateDto);
    expect(result.name).toBe('Alex Updated');
  });
});
