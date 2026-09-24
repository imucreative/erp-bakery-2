import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAccessPayload } from '../../../Applications/security/TokenManager';

/**
 * @GetUser()         — returns full JWT payload
 * @GetUser('sub')    — returns specific field (e.g. user id)
 *
 * Usage in controller:
 *   async getProfile(@GetUser() user: JwtAccessPayload) {}
 *   async getProfile(@GetUser('sub') userId: string) {}
 */
export const GetUser = createParamDecorator(
  (field: keyof JwtAccessPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as FastifyRequest & { user: JwtAccessPayload }).user;
    return field ? user?.[field] : user;
  },
);
