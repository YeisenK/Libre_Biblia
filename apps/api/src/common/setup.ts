import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getConfig } from './config';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { requestIdMiddleware } from './request-id.middleware';

/** Configuración común de la app (la usan main.ts y los tests e2e). */
export function configureApp(app: INestApplication, opts: { swagger?: boolean } = {}) {
  const cfg = getConfig();
  app.setGlobalPrefix('api/v1');
  app.use(requestIdMiddleware);
  app.use(
    helmet({
      // Swagger UI necesita scripts/estilos en línea; el resto de la API devuelve solo JSON.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: cfg.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client', 'X-Request-Id', 'If-None-Match'],
    exposedHeaders: ['ETag', 'X-Request-Id'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  if (opts.swagger !== false) {
    const doc = new DocumentBuilder()
      .setTitle('Biblia Católica API')
      .setDescription('Contrato en docs/API.md')
      .setVersion('1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
}
