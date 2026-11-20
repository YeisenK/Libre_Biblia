import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PatchUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  displayName?: string;
}

export class DeleteUserDto {
  @ApiProperty() @IsString() @MaxLength(128)
  password!: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: ['light', 'dark', 'sepia', 'system'] }) @IsOptional() @IsIn(['light', 'dark', 'sepia', 'system'])
  theme?: 'light' | 'dark' | 'sepia' | 'system';

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.5) @Max(3)
  fontScale?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(3)
  lineHeight?: number;

  @ApiPropertyOptional({ enum: ['narrow', 'normal', 'wide'] }) @IsOptional() @IsIn(['narrow', 'normal', 'wide'])
  margin?: 'narrow' | 'normal' | 'wide';

  @ApiPropertyOptional({ enum: ['chapter', 'verse', 'continuous'] }) @IsOptional() @IsIn(['chapter', 'verse', 'continuous'])
  readingMode?: 'chapter' | 'verse' | 'continuous';

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(20)
  defaultVersion?: string | null;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(4) @IsString({ each: true }) @MaxLength(20, { each: true })
  parallelVersions?: string[];
}
