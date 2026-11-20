import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateBookmarkDto {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Za-z0-9_-]{1,20}$/, { message: 'Código de versión no válido' })
  version?: string;
  @ApiProperty() @IsString() @MaxLength(30)
  book!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  chapter!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300)
  verse?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  label?: string;
}
