import bcrypt from "bcryptjs";

export async function hashString(
  input: string,
  rounds: number = 10
): Promise<string> {
  if (!Number.isFinite(rounds) || rounds <= 0) {
    throw new Error("rounds must be a positive number");
  }
  rounds = Math.min(20, rounds);
  return await bcrypt.hash(input, rounds);
}

export async function verifyHash(
  input: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(input, hash);
}
