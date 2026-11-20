import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getConfig } from './common/config';
import { configureApp } from './common/setup';

async function bootstrap() {
  const cfg = getConfig(); // falla pronto si la configuración es inválida
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();
  configureApp(app);
  await app.listen(cfg.API_PORT, '0.0.0.0');
  new Logger('Bootstrap').log(`API escuchando en http://localhost:${cfg.API_PORT}/api/v1 (docs: /api/docs)`);
}

bootstrap().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
