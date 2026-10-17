import { NextRequest, NextResponse } from "next/server";
import { sophieTurn } from "@/lib/sophie";
import { buildSeedData } from "@/lib/seed";
import { AppData } from "@/lib/types";

// Sophie conversational endpoint. Uses the finance-aware local engine + memory by default.
// If OPENAI_API_KEY is set in Vercel env vars, it augments replies with an LLM.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { message, data } = body as { message?: string; data?: AppData };
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const appData: AppData = data ?? buildSeedData();
  const turn = sophieTurn(message, appData);

  // Memory mutations/queries and direct call triggers should stay deterministic.
  if (turn.source === "memory" || turn.callRequested) {
    return NextResponse.json(turn);
  }

  let reply = turn.reply;
  let source: string = turn.source;

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const mem = turn.memory;
      const memorySummary = [
        mem?.preferredName ? `Preferred user name: ${mem.preferredName}.` : "",
        mem?.tone ? `Preferred tone: ${mem.tone}.` : "",
        mem?.facts?.length ? `Learned facts: ${mem.facts.map((f) => f.text).join("; ")}.` : ""
      ]
        .filter(Boolean)
        .join(" ");

      const recentHistory = Array.isArray(appData.chat)
        ? appData.chat.slice(-6).map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("assistant" as const),
            content: m.text
          }))
        : [];

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
                "Be warm, natural, concise, use emoji unless formal tone is requested, and ground every number in the local analysis. " +
                (memorySummary ? `${memorySummary} ` : "") +
                "Local analysis says: " +
                reply.replace(/\n/g, " ").slice(0, 1500)
            },
            ...recentHistory,
            { role: "user", content: message }
          ],
          max_tokens: 500
        })
      });
      if (r.ok) {
        const j = await r.json();
        const llm = j?.choices?.[0]?.message?.content;
        if (llm) {
          reply = llm;
          source = "openai";
        }
      }
    } catch {
      // fall back to local engine
    }
  }
  return NextResponse.json({
    reply,
    source,
    memory: turn.memory,
    ...(turn.callRequested ? { callRequested: true } : {})
  });
}
