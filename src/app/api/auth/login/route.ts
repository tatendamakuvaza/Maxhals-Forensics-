import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import { buildSeedData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const users = buildSeedData().users;
  const user = users.find(
    (u) => u.email.toLowerCase() === String(email ?? "").trim().toLowerCase() && u.password === String(password ?? "")
  );
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const token = createToken({ uid: user.id, email: user.email, role: user.role, name: user.name });
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, department: user.department } });
  res.cookies.set("mh_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });
  return res;
}
