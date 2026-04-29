import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configureGlobalResponseHandling } from '../src/common/http/global-response.helper';

jest.setTimeout(90000);

process.env.NODE_ENV = 'test';
process.env.ENABLE_OPTIMIZATION_WORKER_IN_TESTS ??= 'false';
process.env.JWT_SECRET ??= 'changeme_jwt_secret_dev';
process.env.DATABASE_URL ??= 'postgresql://dispatch:dispatch@localhost:5433/dispatch_dev';
process.env.REDIS_URL ??= 'redis://localhost:6379';

export const configureE2eApp = (app: INestApplication): void => {
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  configureGlobalResponseHandling(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dispatch Planner API')
    .setDescription(
      'All successful responses are wrapped as { success: true, data: ... } and errors as { success: false, error: { code, message } }.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
};
