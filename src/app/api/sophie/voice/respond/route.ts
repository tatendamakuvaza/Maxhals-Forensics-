import { NextRequest, NextResponse } from "next/server";
import { buildSeedData } from "@/lib/seed";
import { isGoodbyePhrase, sophieTurn, stripForSpeech } from "@/lib/sophie";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveBaseUrl(req: NextRequest): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const fwdHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = fwdHost || req.headers.get("host")?.trim();
  if (host) {
    const fwdProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = fwdProto || (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }

  return req.nextUrl.origin.replace(/\/+$/, "");
}

async function extractSpeech(req: NextRequest): Promise<string> {
  const fromQuery =
    req.nextUrl.searchParams.get("SpeechResult") ??
    req.nextUrl.searchParams.get("speech") ??
    req.nextUrl.searchParams.get("message");
  if (fromQuery) return fromQuery.trim();

  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      return String(j?.SpeechResult ?? j?.speech ?? j?.message ?? "").trim();
    }
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const val = fd.get("SpeechResult") ?? fd.get("speech") ?? fd.get("Body") ?? fd.get("message");
      return typeof val === "string" ? val.trim() : "";
    }
    const raw = await req.text();
    if (raw) {
      const params = new URLSearchParams(raw);
      const val = params.get("SpeechResult") ?? params.get("speech") ?? params.get("Body") ?? params.get("message");
      if (val) return val.trim();
    }
  } catch {
    // ignore parse errors and treat as silence
  }
  return "";
}

async function handleVoiceTurn(req: NextRequest): Promise<NextResponse> {
  const baseUrl = resolveBaseUrl(req);
  const respondUrl = escapeXml(`${baseUrl}/api/sophie/voice/respond`);
  const speech = await extractSpeech(req);

  if (!speech) {
    const silenceXml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<Response>`,
      `  <Say voice="Polly.Joanna">I did not hear a question. Feel free to call back anytime you need your Maxhals Forensics numbers. Goodbye!</Say>`,
      `  <Hangup/>`,
      `</Response>`
    ].join("\n");
    return new NextResponse(silenceXml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" }
    });
  }

  if (isGoodbyePhrase(speech)) {
    const byeXml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<Response>`,
      `  <Say voice="Polly.Joanna">Goodbye, Tatenda! Have a great day. I will keep watching your books.</Say>`,
      `  <Hangup/>`,
      `</Response>`
    ].join("\n");
    return new NextResponse(byeXml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" }
    });
  }

  const appData = buildSeedData();
  const turn = sophieTurn(speech, appData);
  let spoken = stripForSpeech(turn.reply);

  const key = process.env.OPENAI_API_KEY;
  if (key && turn.source !== "memory") {
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
                "You are Sophie, the AI financial assistant of Maxhals Forensics on a live phone call with Tatenda Makuvaza. " +
                "Reply in 2 to 3 natural spoken sentences without markdown or bullet points, grounded in: " +
                spoken.slice(0, 1200)
            },
            { role: "user", content: speech }
          ],
          max_tokens: 220
        })
      });
      if (r.ok) {
        const j = await r.json();
        const llm = j?.choices?.[0]?.message?.content;
        if (llm) spoken = stripForSpeech(llm);
      }
    } catch {
      // keep local spoken reply
    }
  }

  const answerXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Response>`,
    `  <Say voice="Polly.Joanna">${escapeXml(spoken)}</Say>`,
    `  <Gather input="speech" action="${respondUrl}" method="POST" speechTimeout="auto" language="en-US">`,
    `    <Say voice="Polly.Joanna">What else would you like to check?</Say>`,
    `  </Gather>`,
    `  <Say voice="Polly.Joanna">Thank you for calling Sophie at Maxhals Forensics. Goodbye!</Say>`,
    `  <Hangup/>`,
    `</Response>`
  ].join("\n");

  return new NextResponse(answerXml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" }
  });
}

export async function GET(req: NextRequest) {
  return handleVoiceTurn(req);
}

export async function POST(req: NextRequest) {
  return handleVoiceTurn(req);
}
