import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV === 'development' }),
  );

  // ─── Global prefix ───────────────────────────────────────────────────────
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // ─── CORS ────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global validation pipe ───────────────────────────────────────────────
  // Validates all DTOs using class-validator decorators.
  // whitelist: strip unknown properties
  // forbidNonWhitelisted: reject requests with extra fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger ─────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ERP Bakery API')
      .setDescription(
        [
          '## ERP Bakery — Backend API Documentation',
          '',
          '### Authentication',
          'All protected endpoints require a **Bearer** access token.',
          'Obtain one via `POST /api/v1/auth/login`.',
          '',
          '### SaaS Multi-tenant',
          'Each company is an isolated tenant. Users belong to exactly one company.',
          'SUPER_ADMIN users bypass all tenant and permission checks.',
          '',
          '### Permission-based Authorization',
          'Access is controlled by **permission strings** (e.g. `product.read`, `sales.manage`).',
          '`module.manage` automatically implies `module.read`.',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'Bearer',
      )
      .addTag('Authentication', 'Login, refresh token, logout')
      .addTag('Companies', 'SaaS company registration and management')
      .addTag('Outlets', 'Physical bakery outlets per company')
      .addTag('Roles', 'Roles and their permissions per company')
      .addTag('Users', 'Invite users, assign roles and outlets')
      .addTag('Product Groups', 'Product group master data per company')
      .addTag('UOM', 'Unit of measure master data per company')
      .addTag('Suppliers', 'Supplier master data per company')
      .addTag('Categories', 'Product category master data per company')
      .addTag('Products', 'Product master data per company')
      .addTag('Inventory', 'Stock-on-hand, movement ledger, batch & expiry monitoring')
      .addTag('Stock Adjustments', 'Stock correction documents (draft → submit → approve → complete)')
      .addTag('Stock Transfers', 'Inter-outlet transfers (draft → submit → dispatch → receive)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'ERP Bakery API Docs',
    });

    console.log(
      `📚 Swagger docs available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
    );
  }

  // ─── Start server ─────────────────────────────────────────────────────────
  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, host);
  console.log(`🚀 Server running at http://${host}:${port}/${apiPrefix}`);
}

bootstrap();
