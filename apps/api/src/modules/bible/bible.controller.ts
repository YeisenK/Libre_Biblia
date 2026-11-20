import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { BibleService } from './bible.service';
import { CODE_RE, ChapterParamsDto, ParallelParamsDto, ParallelQueryDto, PassageQueryDto } from './dto/bible.dto';
import { BadRequestException } from '@nestjs/common';

@ApiTags('bible')
@Public()
@Controller('bible')
export class BibleController {
  constructor(private readonly bible: BibleService) {}

  @Get('versions') versions() { return this.bible.versions(); }

  @Get('versions/:code/books') books(@Param('code') code: string) {
    return this.bible.books(this.codigo(code));
  }

  @Get('versions/:code/chapters/:book/:chapter')
  chapter(@Param() p: ChapterParamsDto) { return this.bible.chapter(p.code, p.book, p.chapter); }

  @Get('parallel/:book/:chapter')
  parallel(@Param() p: ParallelParamsDto, @Query() q: ParallelQueryDto) {
    return this.bible.parallel(p.book, p.chapter, q.versions);
  }

  @Get('passage') passage(@Query() q: PassageQueryDto) { return this.bible.passage(q.ref, q.version); }

  @Get('versions/:code/offline')
  async offline(@Param('code') code: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { etag, load } = await this.bible.offline(this.codigo(code));
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    if (req.headers['if-none-match'] === etag) {
      res.status(304);
      return;
    }
    return load();
  }

  private codigo(c: string) {
    if (!CODE_RE.test(c)) throw new BadRequestException('Código de versión no válido');
    return c;
  }
}
