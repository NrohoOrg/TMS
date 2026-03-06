import { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { TransformResponseInterceptor } from '../interceptors/transform-response.interceptor';

export const configureGlobalResponseHandling = (app: INestApplication): void => {
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
};
