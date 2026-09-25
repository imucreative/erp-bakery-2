import { Module } from '@nestjs/common';
import { UserController } from './user.controller';

/**
 * UserModule
 *
 * CreateUserUseCase, UpdateUserUseCase, UserRepository, RoleRepository and
 * OutletRepository are provided/exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [UserController],
})
export class UserModule {}
