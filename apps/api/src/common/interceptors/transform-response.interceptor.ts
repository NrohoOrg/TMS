import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

type ResponseEnvelope = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((payload: unknown) => this.transform(payload)));
  }

  private transform(payload: unknown): unknown {
    if (this.isEnvelope(payload)) {
      return payload;
    }

    return {
      success: true,
      data: payload,
    };
  }

  private isEnvelope(payload: unknown): payload is ResponseEnvelope {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    return (
      typeof candidate.success === 'boolean' &&
      (Object.prototype.hasOwnProperty.call(candidate, 'data') ||
        Object.prototype.hasOwnProperty.call(candidate, 'error'))
    );
  }
}
