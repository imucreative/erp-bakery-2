import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';

/**
 * RoleModule
 *
 * RoleRepository is provided and exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [RoleController],
})
export class RoleModule {}
