import { NextRequest, NextResponse } from "next/server";

// WhatsApp messaging endpoint.
// 1) If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM are set in
//    Vercel environment variables, it delivers real WhatsApp messages via Twilio's
//    WhatsApp API to Tatenda's number (+263782514255).
// 2) Otherwise it returns a wa.me deep link that opens WhatsApp Web/mobile with
//    the message pre-filled — clicking "Send" completes delivery.

const DEFAULT_TO = "+263782514255";

export async function POST(req: NextRequest) {
  const { to, message } = await req.json().catch(() => ({}));
  const target = (to || DEFAULT_TO).replace(/[^\d+]/g, "");
  const text = String(message ?? "Hello from Maxhals Forensics Suite");

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (sid && token && from) {
    try {
      const body = new URLSearchParams({
        From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
        To: target.startsWith("whatsapp:") ? target : `whatsapp:${target}`,
        Body: text
      });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
      if (r.ok) {
        return NextResponse.json({ ok: true, delivered: true, channel: "twilio-whatsapp" });
      }
      const err = await r.text();
      return NextResponse.json({ ok: false, delivered: false, error: err.slice(0, 300), fallback: waLink(target, text) }, { status: 502 });
    } catch (e) {
      return NextResponse.json({ ok: false, delivered: false, error: String(e), fallback: waLink(target, text) }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, delivered: false, channel: "wa-me", link: waLink(target, text) });
}

function waLink(to: string, text: string) {
  return `https://wa.me/${to.replace("+", "")}?text=${encodeURIComponent(text)}`;
}
