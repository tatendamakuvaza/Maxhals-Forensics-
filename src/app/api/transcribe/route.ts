import { NextRequest, NextResponse } from "next/server";

const MISSING_KEY_MESSAGE =
  "Audio transcription requires OPENAI_API_KEY in your environment variables. Use live mic dictation in Chrome/Edge or type your question instead.";

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        configured: false,
        error: MISSING_KEY_MESSAGE
      },
      { status: 503 }
    );
  }
  return NextResponse.json({
    configured: true,
    model: process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1"
  });
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        configured: false,
        error: MISSING_KEY_MESSAGE
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an audio file in the 'file' field." },
      { status: 400 }
    );
  }

  const uploaded = (formData.get("file") || formData.get("audio")) as File | Blob | null;
  if (!uploaded || typeof uploaded === "string" || uploaded.size === 0) {
    return NextResponse.json(
      { error: "Please attach a non-empty audio file in the 'file' field." },
      { status: 400 }
    );
  }

  const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
  const upstream = new FormData();
  const fileName = "name" in uploaded && uploaded.name ? uploaded.name : "audio-note.webm";
  upstream.append("file", uploaded, fileName);
  upstream.append("model", model);

  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`
      },
      body: upstream
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errBody?.error?.message ||
            `Transcription service returned HTTP ${r.status}. Check your OPENAI_API_KEY and audio format.`
        },
        { status: r.status >= 400 && r.status < 600 ? r.status : 502 }
      );
    }
    const j = await r.json();
    return NextResponse.json({
      text: (j?.text ?? "").trim(),
      model
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach OpenAI transcription endpoint. Please try again or use live mic dictation." },
      { status: 502 }
    );
  }
}
