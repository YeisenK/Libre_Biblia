import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { HistoryEntryDto, HistoryQueryDto, PositionDto } from './dto/reading.dto';
import { ReadingService } from './reading.service';

@ApiTags('reading')
@ApiBearerAuth()
@Controller('reading')
export class ReadingController {
  constructor(private readonly svc: ReadingService) {}

  @Post('history') @HttpCode(204)
  async add(@CurrentUser() u: AuthUser, @Body() dto: HistoryEntryDto) { await this.svc.addHistory(u.id, dto); }

  @Get('history') history(@CurrentUser() u: AuthUser, @Query() q: HistoryQueryDto) { return this.svc.history(u.id, q.limit); }

  @Get('position') position(@CurrentUser() u: AuthUser) { return this.svc.getPosition(u.id); }

  @Put('position') put(@CurrentUser() u: AuthUser, @Body() dto: PositionDto) { return this.svc.putPosition(u.id, dto); }
}
