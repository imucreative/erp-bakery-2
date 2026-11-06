import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';

/**
 * PlatformModule
 *
 * PlatformRepository is provided and exported by InfrastructureModule (@Global)
 * — no re-declaration needed.
 */
@Module({
  controllers: [PlatformController],
})
export class PlatformModule {}
