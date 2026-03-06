import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

type HttpResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

type ValidationErrorPayload = {
  field: string;
  message: string;
};

type ErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      errors: ValidationErrorPayload[];
    };
  };
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    const mappedError = this.mapException(exception);
    response.status(mappedError.status).json(mappedError.body);
  }

  private mapException(exception: unknown): { status: number; body: ErrorEnvelope } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (this.isErrorEnvelope(payload)) {
        return {
          status: exception.getStatus(),
          body: payload,
        };
      }
    }

    if (exception instanceof UnauthorizedException) {
      const message = this.getHttpMessage(exception);
      return {
        status: 401,
        body: this.createErrorBody(
          this.isInvalidCredentials(message) ? 'INVALID_CREDENTIALS' : 'UNAUTHORIZED',
          message,
        ),
      };
    }

    if (exception instanceof ForbiddenException) {
      return {
        status: 403,
        body: this.createErrorBody('FORBIDDEN', this.getHttpMessage(exception)),
      };
    }

    if (exception instanceof NotFoundException) {
      return {
        status: 404,
        body: this.createErrorBody('NOT_FOUND', this.getHttpMessage(exception)),
      };
    }

    if (exception instanceof ConflictException) {
      return {
        status: 409,
        body: this.createErrorBody('CONFLICT', this.getHttpMessage(exception)),
      };
    }

    if (exception instanceof BadRequestException) {
      return {
        status: 400,
        body: this.createErrorBody('VALIDATION_ERROR', 'Validation failed', {
          errors: this.extractErrors(exception.getResponse()),
        }),
      };
    }

    if (exception instanceof HttpException && exception.getStatus() === 429) {
      return {
        status: 429,
        body: this.createErrorBody('RATE_LIMIT', this.getHttpMessage(exception)),
      };
    }

    return {
      status: 500,
      body: this.createErrorBody('SERVER_ERROR', this.getUnknownMessage(exception)),
    };
  }

  private createErrorBody(
    code: string,
    message: string,
    details?: { errors: ValidationErrorPayload[] },
  ): ErrorEnvelope {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    };
  }

  private getHttpMessage(exception: HttpException): string {
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const responsePayload = payload as { message?: unknown };
      if (Array.isArray(responsePayload.message) && responsePayload.message.length > 0) {
        return String(responsePayload.message[0]);
      }

      if (typeof responsePayload.message === 'string') {
        return responsePayload.message;
      }
    }

    return exception.message;
  }

  private getUnknownMessage(exception: unknown): string {
    if (process.env.NODE_ENV === 'production') {
      return 'Internal server error';
    }

    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private extractErrors(payload: unknown): ValidationErrorPayload[] {
    if (typeof payload === 'string') {
      return [{ field: 'request', message: payload }];
    }

    if (payload && typeof payload === 'object') {
      const errorPayload = payload as { errors?: unknown; message?: unknown };
      const rawErrors = Array.isArray(errorPayload.errors)
        ? errorPayload.errors
        : Array.isArray(errorPayload.message)
          ? errorPayload.message
          : typeof errorPayload.message === 'string'
            ? [errorPayload.message]
            : [];

      const parsedErrors = rawErrors
        .map((error) => this.normalizeError(error))
        .filter((error): error is ValidationErrorPayload => error !== null);

      if (parsedErrors.length > 0) {
        return parsedErrors;
      }
    }

    return [{ field: 'request', message: 'Invalid request' }];
  }

  private normalizeError(error: unknown): ValidationErrorPayload | null {
    if (typeof error === 'string') {
      return {
        field: this.extractField(error),
        message: error,
      };
    }

    if (error && typeof error === 'object') {
      const errorObject = error as { field?: unknown; message?: unknown };
      if (typeof errorObject.field === 'string' && typeof errorObject.message === 'string') {
        return {
          field: errorObject.field,
          message: errorObject.message,
        };
      }
    }

    return null;
  }

  private extractField(message: string): string {
    const [field] = message.split(' ');
    return field || 'request';
  }

  private isInvalidCredentials(message: string): boolean {
    return message.toLowerCase().includes('invalid credentials');
  }

  private isErrorEnvelope(payload: unknown): payload is ErrorEnvelope {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as { success?: unknown; error?: unknown };
    if (candidate.success !== false || !candidate.error || typeof candidate.error !== 'object') {
      return false;
    }

    const error = candidate.error as { code?: unknown; message?: unknown };
    return typeof error.code === 'string' && typeof error.message === 'string';
  }
}
