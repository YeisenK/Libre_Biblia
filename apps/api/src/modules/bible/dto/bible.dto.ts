import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const CODE_RE = /^[A-Za-z0-9_-]{1,20}$/;

export class ChapterParamsDto {
  @ApiProperty() @Matches(CODE_RE, { message: 'Código de versión no válido' })
  code!: string;
  @ApiProperty() @IsString() @MaxLength(30)
  book!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  chapter!: number;
}

export class ParallelParamsDto {
  @ApiProperty() @IsString() @MaxLength(30)
  book!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  chapter!: number;
}

export class ParallelQueryDto {
  @ApiProperty({ example: 'VULG,DRA', description: '2 a 4 códigos separados por comas' })
  @IsString() @MaxLength(100)
  versions!: string;
}

export class PassageQueryDto {
  @ApiProperty({ example: 'Jn 3,16-18' }) @IsString() @MaxLength(100)
  ref!: string;
  @ApiPropertyOptional() @IsOptional() @Matches(CODE_RE, { message: 'Código de versión no válido' })
  version?: string;
}
