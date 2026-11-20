import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/**
 * Asigna un request-id (cabecera X-Request-Id) y registra cada petición.
 * Solo se registran método, ruta SIN query y estado: nunca cuerpos, cabeceras ni cookies.
 */
export function requestIdMiddleware(req: Request & { id?: string }, res: Response, next: NextFunction) {
  const entrante = req.headers['x-request-id'];
  const id = typeof entrante === 'string' && /^[\w-]{8,64}$/.test(entrante) ? entrante : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  const inicio = Date.now();
  res.on('finish', () => {
    logger.log(`[${id}] ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - inicio}ms`);
  });
  next();
}
