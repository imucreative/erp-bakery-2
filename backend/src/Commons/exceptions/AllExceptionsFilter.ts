import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ClientError } from './ClientError';
import DomainErrorTranslator from './DomainErrorTranslator';

/**
 * Global exception filter — mirrors sample-be's onPreResponse handler.
 *
 * Order of handling:
 * 1. Translate domain error codes → typed ClientError
 * 2. ClientError  → proper 4xx JSON response
 * 3. NestJS HttpException → re-use its status + message
 * 4. Everything else → 500 with generic message
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Step 1: translate domain string errors to typed ClientError
    const translated =
      exception instanceof Error
        ? DomainErrorTranslator.translate(exception)
        : exception;

    // Step 2: ClientError (our 4xx hierarchy)
    if (translated instanceof ClientError) {
      reply.status(translated.statusCode).send({
        success: false,
        message: translated.message,
        errors: null,
      });
      return;
    }

    // Step 3: NestJS built-in HttpException (ValidationPipe etc.)
    if (translated instanceof HttpException) {
      const status = translated.getStatus();
      const res = translated.getResponse();

      // ValidationPipe returns { message: string[] }
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const messages = (res as { message: string | string[] }).message;
        const errors = Array.isArray(messages)
          ? messages.map((m) => ({ field: null, message: m }))
          : null;

        reply.status(status).send({
          success: false,
          message: Array.isArray(messages) ? 'Validasi request gagal' : messages,
          errors,
        });
      } else {
        reply.status(status).send({
          success: false,
          message: translated.message,
          errors: null,
        });
      }
      return;
    }

    // Step 4: Unexpected server error
    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}`,
      translated instanceof Error ? translated.stack : String(translated),
    );

    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      message: 'Terjadi kesalahan pada server',
      errors: null,
    });
  }
}
