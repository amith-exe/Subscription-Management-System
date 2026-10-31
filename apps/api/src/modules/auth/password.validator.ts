import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
export function StrongPassword(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => registerDecorator({ name: 'strongPassword', target: target.constructor, propertyName: propertyKey.toString(), options, validator: { validate(value: unknown): boolean { return typeof value === 'string' && value.length > 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^A-Za-z0-9]/.test(value); }, defaultMessage(_args: ValidationArguments): string { return 'Password must be more than 8 characters and include uppercase, lowercase, and special characters'; } } });
}
