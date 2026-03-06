import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';

type HttpResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

type ValidationErrorPayload = {
  field: string;
  message: string;
};

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    response.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors: this.extractErrors(exception.getResponse()),
    });
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
          : [];

      const parsedErrors = rawErrors
        .map((error) => this.normalizeError(error))
        .filter((error): error is ValidationErrorPayload => error !== null);

      if (parsedErrors.length > 0) {
        return parsedErrors;
      }

      if (typeof errorPayload.message === 'string') {
        return [{ field: this.extractField(errorPayload.message), message: errorPayload.message }];
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
}
