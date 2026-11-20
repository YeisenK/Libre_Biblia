import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/** Formato uniforme `{ statusCode, message, error }`; los 500 no filtran detalles internos. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Excepciones');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { statusCode: status, message: body, error: HttpStatus[status] ?? 'Error' }
          : { statusCode: status, ...(body as object) };
      res.status(status).json(payload);
      return;
    }

    this.logger.error(
      `[${req.id ?? '-'}] ${req.method} ${req.path}: ${exception instanceof Error ? exception.stack : String(exception)}`,
    );
    res.status(500).json({ statusCode: 500, message: 'Error interno del servidor', error: 'Internal Server Error' });
  }
}
