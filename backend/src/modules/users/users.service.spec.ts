import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, AccountStatus, KycStatus } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: Partial<User> = {
    id: 'user-123',
    name: 'Alex Wright',
    email: 'alex@example.com',
    accountStatus: AccountStatus.ACTIVE,
    kycStatus: KycStatus.APPROVED,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMe', () => {
    it('should return user profile when user exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.getMe('user-123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });

  describe('updateMe', () => {
    it('should update user fields and return updated profile', async () => {
      const updateDto = { name: 'Alex Updated', phone: '+1234567890' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUserRepository.update.mockResolvedValueOnce({ affected: 1 });
      mockUserRepository.findOne.mockResolvedValueOnce(updatedUser);

      const result = await service.updateMe('user-123', updateDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'user-123' },
        updateDto,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should propagate NotFoundException if user does not exist after update', async () => {
      mockUserRepository.update.mockResolvedValueOnce({ affected: 0 });
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.updateMe('user-unknown', { name: 'Nobody' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
