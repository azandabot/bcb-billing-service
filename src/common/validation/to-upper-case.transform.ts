import { Transform } from 'class-transformer';

/** Trims and upper-cases a string so codes compare case-insensitively. */
export function ToUpperCase(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
}
