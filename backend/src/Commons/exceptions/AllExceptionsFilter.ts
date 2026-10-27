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
import {
  asPostgresError,
  isInternalPostgresError,
  translatePostgresError,
  type PostgresErrorFields,
} from './PostgresErrorTranslator';

/**
 * Global exception filter — mirrors sample-be's onPreResponse handler.
 *
 * Order of handling:
 * 1. Translate domain error codes → typed ClientError
 * 2. ClientError  → proper 4xx JSON response
 * 3. NestJS HttpException → re-use its status + message
 * 4. Postgres driver error the user can act on → 4xx with a concrete reason
 * 5. Everything else → 500 carrying a reference code that matches the log entry
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

    // Step 4: Postgres driver error — constraint violations and serialization
    // failures describe something the user can actually fix or retry.
    const pgFields = asPostgresError(translated);
    if (pgFields && !isInternalPostgresError(pgFields)) {
      const clientError = translatePostgresError(pgFields);
      if (clientError) {
        this.logger.warn(
          `${clientError.statusCode} on ${request.method} ${request.url} — ` +
            `${this._describePostgres(pgFields)}`,
        );
        reply.status(clientError.statusCode).send({
          success: false,
          message: clientError.message,
          errors: null,
        });
        return;
      }
    }

    // Step 5: Unexpected server error. The reference code is the only thread
    // between what the user sees on screen and this log line.
    const reference = request.id ?? 'n/a';
    const context = pgFields ? ` — ${this._describePostgres(pgFields)}` : '';

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url} [ref=${reference}]${context}`,
      translated instanceof Error ? translated.stack : String(translated),
    );

    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      message:
        'Terjadi kesalahan teknis di server, bukan pada data yang Anda kirim. ' +
        `Laporkan kode referensi ${reference} ke tim teknis agar bisa ditelusuri.`,
      reference,
      errors: null,
    });
  }

  private _describePostgres(fields: PostgresErrorFields): string {
    const parts = [`pg=${fields.code}`];
    if (fields.table) parts.push(`table=${fields.table}`);
    if (fields.column) parts.push(`column=${fields.column}`);
    if (fields.constraint) parts.push(`constraint=${fields.constraint}`);
    if (fields.detail) parts.push(`detail=${fields.detail}`);
    return parts.join(' ');
  }
}

