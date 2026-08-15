/**
 * Injectable source of the current time. Used as both the DI token and the type so
 * account creation instants stay deterministic under test.
 */
export abstract class Clock {
  abstract now(): Date;
}
