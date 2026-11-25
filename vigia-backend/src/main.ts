import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:4200' });
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001; // changed default to 3001 to avoid conflict
  await app.listen(port);
}
await bootstrap();
