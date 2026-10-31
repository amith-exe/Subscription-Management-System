import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiStandardErrors(): MethodDecorator {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Validation or malformed request' }),
    ApiResponse({ status: 401, description: 'Authentication required or invalid credentials' }),
    ApiResponse({ status: 403, description: 'Insufficient permissions' }),
    ApiResponse({ status: 404, description: 'Resource not found' }),
    ApiResponse({ status: 409, description: 'Resource conflict' }),
    ApiResponse({ status: 423, description: 'Account temporarily locked' }),
    ApiResponse({ status: 429, description: 'Rate limit exceeded' }),
  );
}
