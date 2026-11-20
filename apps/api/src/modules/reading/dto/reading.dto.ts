import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const CODE = /^[A-Za-z0-9_-]{1,20}$/;

export class HistoryEntryDto {
  @ApiProperty() @Matches(CODE, { message: 'Código de versión no válido' }) version!: string;
  @ApiProperty() @IsString() @MaxLength(30) book!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(200) chapter!: number;
}

export class HistoryQueryDto {
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;
}

export class PositionDto extends HistoryEntryDto {
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300)
  verse?: number | null;
}
