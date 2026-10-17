import { NextRequest, NextResponse } from "next/server";

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

function buildGreetingTwiml(respondUrl: string): string {
  const safeUrl = escapeXml(respondUrl);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Response>`,
    `  <Gather input="speech" action="${safeUrl}" method="POST" speechTimeout="auto" language="en-US">`,
    `    <Say voice="Polly.Joanna">Hello Tatenda! This is Sophie, your Maxhals Forensics financial assistant. Ask me anything about your profit, cash flow, invoices, taxes or fraud alerts.</Say>`,
    `  </Gather>`,
    `  <Say voice="Polly.Joanna">I did not catch anything. Call me back whenever you want to check your numbers. Goodbye!</Say>`,
    `  <Hangup/>`,
    `</Response>`
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const baseUrl = resolveBaseUrl(req);
  const xml = buildGreetingTwiml(`${baseUrl}/api/sophie/voice/respond`);
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" }
  });
}

export async function POST(req: NextRequest) {
  const baseUrl = resolveBaseUrl(req);
  const xml = buildGreetingTwiml(`${baseUrl}/api/sophie/voice/respond`);
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" }
  });
}
