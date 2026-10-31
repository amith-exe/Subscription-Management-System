import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { MustChangePasswordGuard } from './common/auth/must-change-password.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com', 'https://*.razorpay.com'],
        connectSrc: ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        upgradeInsecureRequests: null,
      },
    },
  }));
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((origin) => origin.trim()), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard), app.get(MustChangePasswordGuard));
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Brightloop Subscription API')
    .setDescription('How to authenticate: call login, keep the access token as a Bearer token, and send the httpOnly refresh cookie to refresh.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addCookieAuth('refresh_token', { type: 'apiKey', in: 'cookie' }, 'refresh-cookie')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  if (config.get<boolean>('SWAGGER_ENABLED') === true && config.get<string>('NODE_ENV') === 'development') SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
  });
  await app.listen(config.getOrThrow<number>('API_PORT'));
}
bootstrap();
