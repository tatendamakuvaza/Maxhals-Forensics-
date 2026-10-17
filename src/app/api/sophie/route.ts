import { NextRequest, NextResponse } from "next/server";
import { sophieReply } from "@/lib/sophie";
import { buildSeedData } from "@/lib/seed";

// Sophie conversational endpoint. Uses the finance-aware local engine by default.
// If OPENAI_API_KEY is set in Vercel env vars, it augments replies with an LLM.
export async function POST(req: NextRequest) {
  const { message, data } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const appData = data ?? buildSeedData();
  let reply = sophieReply(message, appData);

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Sophie, the AI financial assistant of Maxhals Forensics (owner: Tatenda Makuvaza, Zimbabwe). " +
                "Be warm, concise, use emoji, and answer accounting/analytics questions. Local analysis says: " +
                reply.replace(/\n/g, " ").slice(0, 1500)
            },
            { role: "user", content: message }
          ],
          max_tokens: 500
        })
      });
      if (r.ok) {
        const j = await r.json();
        const llm = j?.choices?.[0]?.message?.content;
        if (llm) reply = llm;
      }
    } catch {
      // fall back to local engine
    }
  }
  return NextResponse.json({ reply });
}
