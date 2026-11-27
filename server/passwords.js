import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(String(password), salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedValue) {
  if (typeof storedValue !== 'string') return false;
  const [algorithm, saltHex, keyHex] = storedValue.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex + keyHex)) return false;

  const expected = Buffer.from(keyHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;

  const actual = scryptSync(String(password), Buffer.from(saltHex, 'hex'), KEY_LENGTH, SCRYPT_OPTIONS);
  return timingSafeEqual(actual, expected);
}
