import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/bookmarks.dto';

@ApiTags('bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly svc: BookmarksService) {}

  @Get() list(@CurrentUser() u: AuthUser) { return this.svc.list(u.id); }

  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateBookmarkDto) { return this.svc.create(u.id, dto); }

  @Delete(':id') @HttpCode(204)
  async remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { await this.svc.remove(u.id, id); }
}
