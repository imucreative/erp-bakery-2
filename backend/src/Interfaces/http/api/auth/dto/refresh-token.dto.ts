import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Valid refresh token issued at login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
