import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  IsAfterDay,
  IsUnambiguousInstant,
  MaxPeriodDays,
  parseUtcDay,
} from './date-validators';

class Period {
  @IsUnambiguousInstant()
  start!: string;

  @IsUnambiguousInstant()
  @IsAfterDay('start')
  @MaxPeriodDays('start', 366)
  end!: string;
}

function failedConstraintsFor(value: object): string[] {
  return validateSync(plainToInstance(Period, value)).flatMap((error) =>
    Object.keys(error.constraints ?? {}),
  );
}

describe('parseUtcDay', () => {
  it.each([
    '2026-01-15',
    '2026-01-15T00:00:00Z',
    '2026-01-15T23:30:00+02:00',
    '2026-01-15T23:30:00.500Z',
    '2026-01-15T23:30Z',
  ])('accepts %p', (value) => {
    expect(parseUtcDay(value)).toBeDefined();
  });

  it.each([
    [
      '2026-01-15T00:00:00',
      'a bare local datetime resolves differently per server timezone',
    ],
    ['15/01/2026', 'not ISO 8601'],
    ['2026-13-01', 'not a real month'],
    ['', 'empty'],
  ])('rejects %p because it is %s', (value) => {
    expect(parseUtcDay(value)).toBeUndefined();
  });

  it.each([42, null, undefined, {}])('rejects the non string %p', (value) => {
    expect(parseUtcDay(value)).toBeUndefined();
  });
});

describe('IsUnambiguousInstant', () => {
  it('accepts a date and an instant with an explicit offset', () => {
    expect(
      failedConstraintsFor({
        start: '2026-01-01',
        end: '2026-02-01T00:00:00Z',
      }),
    ).toEqual([]);
  });

  it('rejects a datetime with no offset', () => {
    expect(
      failedConstraintsFor({ start: '2026-01-01T00:00:00', end: '2026-02-01' }),
    ).toContain('isUnambiguousInstant');
  });
});

describe('IsAfterDay', () => {
  it('rejects an end that equals the start', () => {
    expect(
      failedConstraintsFor({ start: '2026-01-01', end: '2026-01-01' }),
    ).toContain('isAfterDay');
  });

  it('rejects an end before the start', () => {
    expect(
      failedConstraintsFor({ start: '2026-02-01', end: '2026-01-01' }),
    ).toContain('isAfterDay');
  });

  it('treats two instants on the same UTC day as equal', () => {
    expect(
      failedConstraintsFor({
        start: '2026-01-01T01:00:00Z',
        end: '2026-01-01T23:00:00Z',
      }),
    ).toContain('isAfterDay');
  });

  it('reports only the malformed field when its counterpart cannot be parsed', () => {
    const failures = failedConstraintsFor({
      start: 'nonsense',
      end: '2026-02-01',
    });

    expect(failures).toContain('isUnambiguousInstant');
    expect(failures).not.toContain('isAfterDay');
  });
});

describe('MaxPeriodDays', () => {
  it('accepts a period at the limit', () => {
    expect(
      failedConstraintsFor({ start: '2026-01-01', end: '2027-01-02' }),
    ).toEqual([]);
  });

  it('rejects a period beyond the limit', () => {
    expect(
      failedConstraintsFor({ start: '2026-01-01', end: '2027-01-03' }),
    ).toContain('maxPeriodDays');
  });
});
