import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ description: '6-digit TOTP code from the authenticator app' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
