import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { getConfig } from './common/config';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { BibleModule } from './modules/bible/bible.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { HealthModule } from './modules/health/health.module';
import { ReadingModule } from './modules/reading/reading.module';
import { SearchModule } from './modules/search/search.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: () => getConfig().THROTTLE_LIMIT }]),
    CommonModule,
    AuthModule,
    UsersModule,
    BibleModule,
    SearchModule,
    BookmarksModule,
    ReadingModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
