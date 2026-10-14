import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let cachedServer: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Global prefix
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  cachedServer = server;
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
