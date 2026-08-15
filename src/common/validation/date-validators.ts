import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { UtcDay } from '../time/utc-day';

/**
 * A bare ISO datetime with no offset is parsed in the server's local zone, so
 * '2026-01-15T00:00:00' resolves to a different UTC day depending on where the
 * service runs. Only a date, or an instant carrying Z or +/-HH:MM, is accepted.
 */
const UNAMBIGUOUS_INSTANT =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

export function parseUtcDay(value: unknown): UtcDay | undefined {
  if (typeof value !== 'string' || !UNAMBIGUOUS_INSTANT.test(value)) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : UtcDay.fromDate(parsed);
}

export function IsUnambiguousInstant(
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isUnambiguousInstant',
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      validator: {
        validate: (value: unknown) => parseUtcDay(value) !== undefined,
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be an ISO 8601 date (YYYY-MM-DD) or an instant with an explicit UTC offset`,
      },
    });
  };
}

export function IsAfterDay(
  relatedProperty: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isAfterDay',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [relatedProperty],
      options,
      validator: {
        validate: (value: unknown, args: ValidationArguments) => {
          const related = parseUtcDay(
            (args.object as Record<string, unknown>)[relatedProperty],
          );
          const current = parseUtcDay(value);
          // A malformed counterpart is already reported by its own constraint.
          return related === undefined || current === undefined
            ? true
            : related.isBefore(current);
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be a later UTC day than ${relatedProperty}`,
      },
    });
  };
}

export function MaxPeriodDays(
  relatedProperty: string,
  maxDays: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'maxPeriodDays',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [relatedProperty, maxDays],
      options,
      validator: {
        validate: (value: unknown, args: ValidationArguments) => {
          const related = parseUtcDay(
            (args.object as Record<string, unknown>)[relatedProperty],
          );
          const current = parseUtcDay(value);
          return related === undefined || current === undefined
            ? true
            : related.daysUntil(current) <= maxDays;
        },
        defaultMessage: (args: ValidationArguments) =>
          `the period from ${relatedProperty} to ${args.property} must not exceed ${maxDays} days`,
      },
    });
  };
}
