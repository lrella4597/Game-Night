const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function normalizeJoinCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function isValidJoinCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(normalizeJoinCode(code));
}
