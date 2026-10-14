import { randomInt } from "node:crypto";

// No 0/O/1/I/L to avoid confusion when a customer reads the code aloud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateBookingCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}
