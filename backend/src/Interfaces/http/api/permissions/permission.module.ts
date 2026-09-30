import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';

/**
 * PermissionModule
 *
 * PermissionRepository is provided and exported by InfrastructureModule (@Global).
 */
@Module({
  controllers: [PermissionController],
})
export class PermissionModule {}
