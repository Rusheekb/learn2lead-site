const WORDS = [
  'Apple',
  'Bright',
  'Cedar',
  'Delta',
  'Eagle',
  'Falcon',
  'Garden',
  'Harbor',
  'Island',
  'Jungle',
  'Kite',
  'Lemon',
  'Maple',
  'Nova',
  'Ocean',
  'Pepper',
  'Quartz',
  'River',
  'Sunny',
  'Tiger',
  'Union',
  'Violet',
  'Willow',
  'Zebra',
];

/**
 * A temporary password a parent can read out or write down ("Maple-4827"):
 * meets the password rule (letters and a number) and is replaced by the
 * student at their first sign-in.
 */
export function generateTempPassword(
  random: (max: number) => number = (max) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }
): string {
  const word = WORDS[random(WORDS.length)];
  const digits = String(1000 + random(9000));
  return `${word}-${digits}`;
}
