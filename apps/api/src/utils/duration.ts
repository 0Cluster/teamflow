const durationPattern = /^(\d+)(s|m|h|d|w|y)$/;

const unitToMilliseconds = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
} as const;

export function durationToMilliseconds(
  duration: string,
): number {
  const match = duration.match(durationPattern);

  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2] as keyof typeof unitToMilliseconds;

  return value * unitToMilliseconds[unit];
}
