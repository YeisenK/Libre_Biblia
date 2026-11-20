import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const normalizarEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty() @Transform(normalizarEmail) @IsEmail({}, { message: 'El correo electrónico no es válido' }) @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 10 })
  @IsString() @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' }) @MaxLength(128)
  password!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty() @Transform(normalizarEmail) @IsEmail({}, { message: 'El correo electrónico no es válido' }) @MaxLength(254)
  email!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128)
  password!: string;
}

export class RefreshBodyDto {
  @ApiPropertyOptional({ description: 'Solo clientes nativos; la web usa la cookie bc_rt' })
  @IsOptional() @IsString() @MaxLength(256)
  refreshToken?: string;
}
