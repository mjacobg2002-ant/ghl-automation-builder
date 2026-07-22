/** Generates a lowercase UUID v4 using the Workers runtime's Web Crypto API. */
export function generateUuid(): string {
  return crypto.randomUUID();
}
