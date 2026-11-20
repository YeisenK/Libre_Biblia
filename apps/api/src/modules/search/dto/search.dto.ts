import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  q!: string;

  @ApiPropertyOptional({ example: 'VULG,DRA' }) @IsOptional() @IsString() @MaxLength(100)
  versions?: string;

  @ApiPropertyOptional({ enum: ['words', 'exact', 'fuzzy'] }) @IsOptional() @IsIn(['words', 'exact', 'fuzzy'])
  mode?: 'words' | 'exact' | 'fuzzy';

  @ApiPropertyOptional({ enum: ['OT', 'NT'] }) @IsOptional() @IsIn(['OT', 'NT'])
  testament?: 'OT' | 'NT';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  book?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  page?: number;

  @ApiPropertyOptional({ default: 25 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}
