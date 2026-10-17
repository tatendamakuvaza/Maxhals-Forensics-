import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "maxhals-dev-secret-change-in-production";

export interface SessionPayload {
  uid: string;
  email: string;
  role: string;
  name: string;
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createToken(payload: Omit<SessionPayload, "exp">, hours = 24 * 7): string {
  const body: SessionPayload = { ...payload, exp: Date.now() + hours * 3600_000 };
  const b64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyToken(token: string): SessionPayload | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
