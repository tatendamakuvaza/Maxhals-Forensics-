"use client";
import React from "react";
import {
  Bot,
  Send,
  Sparkles,
  MessageCircle,
  Trash2,
  Download,
  Brain,
  Wallet,
  Receipt,
  ShieldAlert,
  Calculator,
  FileSpreadsheet,
  Mic,
  MicOff,
  Upload,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Volume2,
  VolumeX,
  AlertCircle
} from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import Logo from "@/components/Logo";
import { useStore } from "@/lib/store";
import { isGoodbyePhrase, sophieTurn, stripForSpeech } from "@/lib/sophie";
import { SophieMemory, SophieMessage } from "@/lib/types";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const QUICK = [
  { icon: Wallet, label: "Earned last month?", q: "What did I earn last month?" },
  { icon: Receipt, label: "Top debtor?", q: "Which client owes me the most?" },
  { icon: Calculator, label: "Can I afford $2,500?", q: "Can I afford a laptop for 2500?" },
  { icon: ShieldAlert, label: "How much do I owe?", q: "How much do I owe?" },
  { icon: FileSpreadsheet, label: "Spent in September?", q: "What did I spend in September?" },
  { icon: Brain, label: "What do you remember?", q: "What do you remember?" }
];

type CallState = "idle" | "incoming" | "speaking" | "listening" | "thinking";

export default function SophiePage() {
  const data = useStore((s) => s.data);
  const addChat = useStore((s) => s.addChat);
  const setSophieMemory = useStore((s) => s.setSophieMemory);
  const update = useStore((s) => s.update);

  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [dictating, setDictating] = React.useState(false);
  const [transcribing, setTranscribing] = React.useState(false);
  const [audioNotice, setAudioNotice] = React.useState<string | null>(null);

  // Voice call states
  const [callState, setCallState] = React.useState<CallState>("idle");
  const [callSeconds, setCallSeconds] = React.useState(0);
  const [callMuted, setCallMuted] = React.useState(false);
  const [speakerOn, setSpeakerOn] = React.useState(true);
  const [liveCaption, setLiveCaption] = React.useState("");
  const [callTypedInput, setCallTypedInput] = React.useState("");

  const endRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dictationRecRef = React.useRef<SpeechRecognitionLike | null>(null);
  const callRecRef = React.useRef<SpeechRecognitionLike | null>(null);
  const callActiveRef = React.useRef(false);
  const callMutedRef = React.useRef(false);
  const speakerOnRef = React.useRef(true);
  const ringIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  const chat = data.chat;
  const memory: SophieMemory = data.sophieMemory ?? { facts: [] };
  const preferredName =
    memory.preferredName || data.settings.company.owner?.trim().split(/\s+/)[0] || "Tatenda";

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, thinking]);

  React.useEffect(() => {
    callMutedRef.current = callMuted;
  }, [callMuted]);

  React.useEffect(() => {
    speakerOnRef.current = speakerOn;
  }, [speakerOn]);

  // Call duration timer
  React.useEffect(() => {
    if (callState === "idle" || callState === "incoming") {
      setCallSeconds(0);
      return;
    }
    const iv = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [callState]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopRingtone();
      dictationRecRef.current?.abort();
      callRecRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playRingtonePulse = () => {
    if (typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
      });
    } catch {
      /* ignore audio context restrictions */
    }
  };

  const startRingtone = () => {
    stopRingtone();
    playRingtonePulse();
    ringIntervalRef.current = setInterval(playRingtonePulse, 1800);
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  };

  const resolveReply = async (msg: string): Promise<{ reply: string; callRequested?: boolean }> => {
    const snap: typeof data = JSON.parse(JSON.stringify(useStore.getState().data));
    const localTurn = sophieTurn(msg, snap);
    if (localTurn.memory) {
      setSophieMemory(localTurn.memory);
    }

    let reply = localTurn.reply;
    let callRequested = localTurn.callRequested;

    try {
      const r = await fetch("/api/sophie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, data: useStore.getState().data })
      });
      if (r.ok) {
        const j = await r.json();
        if (j.reply) reply = j.reply;
        if (j.memory) setSophieMemory(j.memory);
        if (j.callRequested) callRequested = true;
      }
    } catch {
      /* offline fallback uses localTurn */
    }

    return { reply, callRequested };
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || thinking) return;
    setInput("");
    setAudioNotice(null);
    const userMsg: SophieMessage = { id: `M-${Date.now()}`, role: "user", text: msg, ts: Date.now() };
    addChat(userMsg);
    setThinking(true);

    const { reply, callRequested } = await resolveReply(msg);

    await new Promise((res) => setTimeout(res, 320));
    addChat({ id: `M-${Date.now() + 1}`, role: "sophie", text: reply, ts: Date.now() });
    setThinking(false);

    if (callRequested) {
      triggerIncomingCall();
    }
  };

  // ─── Composer Mic Dictation ────────────────────────────────────────────────
  const toggleDictation = () => {
    setAudioNotice(null);
    if (dictating) {
      dictationRecRef.current?.stop();
      setDictating(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setAudioNotice(
        "Live mic dictation isn't supported in this browser. Try Chrome or Edge, upload an audio note, or type your message below."
      );
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      const baseText = input ? `${input.trim()} ` : "";
      rec.onresult = (ev) => {
        let transcript = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          transcript += ev.results[i][0].transcript;
        }
        setInput(`${baseText}${transcript}`.trimStart());
      };
      rec.onerror = () => {
        setDictating(false);
        setAudioNotice("Could not access microphone for dictation. Check mic permissions or type your question.");
      };
      rec.onend = () => {
        setDictating(false);
      };
      dictationRecRef.current = rec;
      setDictating(true);
      rec.start();
    } catch {
      setDictating(false);
      setAudioNotice("Could not start browser speech recognition. Please type your message instead.");
    }
  };

  // ─── Audio Note Upload → /api/transcribe ──────────────────────────────────
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAudioNotice(null);
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setAudioNotice(
          j?.error ||
            "Audio note transcription is unavailable right now. Add OPENAI_API_KEY in Vercel or use live mic dictation."
        );
      } else if (j?.text) {
        setInput(j.text);
        await send(j.text);
      } else {
        setAudioNotice("No speech was detected in that audio note. Try recording again or type your message.");
      }
    } catch {
      setAudioNotice("Failed to upload audio note to /api/transcribe. Please type your question or use mic dictation.");
    } finally {
      setTranscribing(false);
    }
  };

  // ─── Hands-Free Browser Voice Call Engine ──────────────────────────────────
  const speakText = (text: string, onDone: () => void) => {
    const clean = stripForSpeech(text);
    setLiveCaption(`Sophie: "${clean}"`);
    if (
      !speakerOnRef.current ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setTimeout(onDone, 900);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = "en-US";
      utter.rate = 1.03;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          /female|samantha|victoria|google uk english female|aria|jenny|zira/i.test(v.name)
      );
      if (preferredVoice) utter.voice = preferredVoice;
      utter.onend = () => onDone();
      utter.onerror = () => onDone();
      window.speechSynthesis.speak(utter);
    } catch {
      setTimeout(onDone, 900);
    }
  };

  const listenForCallTurn = () => {
    if (!callActiveRef.current) return;
    if (callMutedRef.current) {
      setCallState("listening");
      setLiveCaption("Microphone is muted — unmute or type a message below.");
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setCallState("listening");
      setLiveCaption("Browser speech recognition unavailable — use the typed input below to talk to Sophie.");
      return;
    }
    try {
      callRecRef.current?.abort();
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      setCallState("listening");
      setLiveCaption("Listening… speak now");

      let finalTranscript = "";
      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalTranscript += t;
          else interim += t;
        }
        const shown = (finalTranscript || interim).trim();
        if (shown) setLiveCaption(`You: "${shown}"`);
      };
      rec.onerror = () => {
        if (callActiveRef.current) {
          setLiveCaption("Didn't catch that — speak again or type below.");
        }
      };
      rec.onend = () => {
        if (!callActiveRef.current) return;
        const spoken = finalTranscript.trim();
        if (spoken) {
          void handleCallUtterance(spoken);
        }
      };
      callRecRef.current = rec;
      rec.start();
    } catch {
      setLiveCaption("Could not start mic listener — use the typed fallback below.");
    }
  };

  const handleCallUtterance = async (spoken: string) => {
    if (!callActiveRef.current) return;
    const text = spoken.trim();
    if (!text) return;

    addChat({ id: `M-${Date.now()}`, role: "user", text, ts: Date.now() });

    if (isGoodbyePhrase(text)) {
      const farewell = `Goodbye, ${preferredName}! Have a great day — I'll keep watching your books.`;
      addChat({ id: `M-${Date.now() + 1}`, role: "sophie", text: `📞 ${farewell}`, ts: Date.now() });
      setCallState("speaking");
      speakText(farewell, () => endCall());
      return;
    }

    setCallState("thinking");
    setLiveCaption(`Thinking about "${text}"…`);
    const { reply } = await resolveReply(text);
    if (!callActiveRef.current) return;

    addChat({ id: `M-${Date.now() + 1}`, role: "sophie", text: reply, ts: Date.now() });
    setCallState("speaking");
    speakText(reply, () => {
      if (callActiveRef.current) listenForCallTurn();
    });
  };

  const startActiveCall = () => {
    stopRingtone();
    callActiveRef.current = true;
    setCallMuted(false);
    setCallState("speaking");
    const greeting = `Hello ${preferredName}! This is Sophie on the line. How can I help with your Maxhals Forensics numbers today?`;
    addChat({ id: `M-${Date.now()}`, role: "sophie", text: `📞 ${greeting}`, ts: Date.now() });
    speakText(greeting, () => {
      if (callActiveRef.current) listenForCallTurn();
    });
  };

  const triggerIncomingCall = () => {
    callRecRef.current?.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    callActiveRef.current = false;
    setCallState("incoming");
    setLiveCaption("Incoming voice call from Sophie · Maxhals Forensics AI…");
    startRingtone();
  };

  const endCall = () => {
    stopRingtone();
    callActiveRef.current = false;
    callRecRef.current?.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCallState("idle");
    setLiveCaption("");
    setCallTypedInput("");
  };

  const fmtDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <PageHeader
        title="Sophie — Your AI Financial Assistant"
        subtitle="Conversational finance brain with persistent memory, live voice calls, mic dictation & Whisper audio transcription."
        actions={
          <>
            <button
              onClick={startActiveCall}
              disabled={callState !== "idle"}
              className="btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Phone size={15} /> Call Sophie
            </button>
            <button
              onClick={triggerIncomingCall}
              disabled={callState !== "idle"}
              className="btn-ghost border-aqua-200 text-ink-900 hover:bg-aqua-400/10 disabled:opacity-50"
            >
              <PhoneIncoming size={15} /> Sophie, call me
            </button>
            <button
              onClick={() => {
                const blob = new Blob(
                  [chat.map((m) => `${m.role === "user" ? "You" : "Sophie"}: ${m.text}`).join("\n\n")],
                  { type: "text/plain" }
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "sophie-chat.txt";
                a.click();
              }}
              className="btn-ghost"
            >
              <Download size={15} /> Export chat
            </button>
            <a
              href={`https://wa.me/${data.settings.whatsappNumber.replace("+", "")}?text=${encodeURIComponent(
                "Hello Sophie! Send me my daily Maxhals Forensics briefing."
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <MessageCircle size={15} /> WhatsApp briefing
            </a>
          </>
        }
      />

      {/* Incoming or Active Voice Call Banner */}
      {callState !== "idle" && (
        <div className="mb-4 rounded-2xl border border-aqua-400/40 bg-gradient-to-r from-ink-950 via-ink-900 to-ink-800 p-4 text-white shadow-lg">
          {callState === "incoming" ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <PhoneIncoming size={22} className="animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold">Incoming Call — Sophie AI</p>
                    <Badge color="aqua">Ringing…</Badge>
                  </div>
                  <p className="text-xs text-white/70">
                    Maxhals Forensics Voice Line · Hands-free financial briefing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={startActiveCall}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400"
                >
                  <Phone size={15} /> Answer
                </button>
                <button
                  onClick={endCall}
                  className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-400"
                >
                  <PhoneOff size={15} /> Decline
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                    <Bot size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold">Live Call with Sophie</p>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        ● {fmtDuration(callSeconds)}
                      </span>
                      <Badge color="aqua">
                        {callState === "speaking"
                          ? "Sophie speaking…"
                          : callState === "thinking"
                          ? "Thinking…"
                          : callMuted
                          ? "Muted"
                          : "Listening…"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-white/80">
                      {liveCaption || "Say a question out loud or type in the call bar below."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = !callMuted;
                      setCallMuted(next);
                      if (next) {
                        callRecRef.current?.abort();
                      } else if (callState === "listening") {
                        listenForCallTurn();
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      callMuted ? "bg-amber-500 text-ink-950" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {callMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    {callMuted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    onClick={() => {
                      const next = !speakerOn;
                      setSpeakerOn(next);
                      if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      !speakerOn ? "bg-amber-500 text-ink-950" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {speakerOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    {speakerOn ? "Speaker" : "Speaker off"}
                  </button>
                  {callState === "listening" && !callMuted && (
                    <button
                      onClick={listenForCallTurn}
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-aqua-300 hover:bg-white/20"
                    >
                      Listen again
                    </button>
                  )}
                  <button
                    onClick={endCall}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-rose-400"
                  >
                    <PhoneOff size={14} /> Hang up
                  </button>
                </div>
              </div>

              {/* Typed fallback inside the active call */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = callTypedInput.trim();
                  if (!t) return;
                  setCallTypedInput("");
                  void handleCallUtterance(t);
                }}
                className="flex gap-2"
              >
                <input
                  value={callTypedInput}
                  onChange={(e) => setCallTypedInput(e.target.value)}
                  placeholder="Type to speak during call (or say 'goodbye' to hang up)…"
                  className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white placeholder:text-white/50 focus:border-aqua-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-aqua-400 px-3.5 py-2 text-xs font-bold text-ink-950 hover:bg-aqua-300"
                >
                  Say
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Side panel */}
        <div className="hidden space-y-5 overflow-y-auto lg:col-span-1 lg:block">
          <Card className="bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <Bot size={26} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-emerald-400" />
              </div>
              <div>
                <p className="text-base font-extrabold">Sophie</p>
                <p className="text-[11px] text-aqua-400">Online · MHF-Brain v2.2 · Voice</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/70">
              I connect to your general ledger, invoices, payroll, tax register and fraud model — and I learn your preferences and take voice calls.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["P&L & Cash", "✓"],
                ["Memory", `${(memory.preferredName ? 1 : 0) + (memory.tone ? 1 : 0) + memory.facts.length} items`],
                ["Voice / TTS", "✓"],
                ["Twilio XML", "Ready"]
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/10 px-3 py-2 text-center">
                  <p className="text-[10px] text-white/50">{k}</p>
                  <p className="text-xs font-bold text-aqua-400">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-extrabold text-ink-900">Quick asks</h3>
            <div className="mt-3 space-y-2">
              {QUICK.map((q) => (
                <button
                  key={q.q}
                  onClick={() => send(q.q)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-100 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:border-aqua-400 hover:bg-aqua-400/5"
                >
                  <q.icon size={14} className="text-aqua-500" /> {q.label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink-900">Learned memory</h3>
              <Badge color="aqua">{memory.facts.length} notes</Badge>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Name: <strong>{preferredName}</strong> · Style: <strong>{memory.tone ?? "warm"}</strong>
            </p>
            {memory.facts.length > 0 ? (
              <ul className="mt-2.5 space-y-1 text-[11px] text-slate-600">
                {memory.facts.slice(-3).map((f) => (
                  <li key={f.id} className="truncate">• {f.text}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">
                Try: <em>&ldquo;call me T&rdquo;</em> or <em>&ldquo;remember that I bank with CBZ&rdquo;</em>
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => send("What do you remember?")}
                className="btn-ghost flex-1 py-1.5 text-[11px]"
              >
                Review
              </button>
              <button
                onClick={() => send("Forget everything")}
                className="btn-ghost flex-1 py-1.5 text-[11px] text-rose-600"
              >
                Forget all
              </button>
            </div>
          </Card>
        </div>

        {/* Chat */}
        <Card className="flex min-h-0 flex-col p-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div>
                <p className="text-sm font-extrabold text-ink-900">Sophie · Maxhals Forensics</p>
                <p className="text-[11px] text-emerald-500">
                  ● Online — grounded in your live books · Addressing you as {preferredName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update((d) => { d.chat = []; })}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-rose-500"
                title="Clear chat"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {chat.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <Sparkles size={28} />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-ink-900">Hello {preferredName}! 👋</h3>
                <p className="mt-1.5 max-w-md text-sm text-slate-500">
                  I&apos;m Sophie — ask me about monthly earnings, who owes you the most, affordability, PAYE/NSSA, or teach me facts like{" "}
                  <em>&ldquo;remember that I bank with CBZ&rdquo;</em>. You can also dictate or call me hands-free!
                </p>
              </div>
            )}

            {chat.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    m.role === "user"
                      ? "bg-ink-900 text-white"
                      : "bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950"
                  }`}
                >
                  {m.role === "user" ? "TM" : <Bot size={16} />}
                </div>
                <div
                  className={`max-w-[78%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-ink-900 text-white"
                      : "border border-slate-100 bg-slate-50 text-slate-700"
                  }`}
                >
                  {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i} className={m.role === "user" ? "font-bold text-aqua-300" : "font-bold text-ink-900"}>
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    )
                  )}
                  <p className={`mt-1.5 text-[10px] ${m.role === "user" ? "text-white/40" : "text-slate-400"}`}>
                    {new Date(m.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-aqua-400 to-gold-400 text-ink-950">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-aqua-500"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            {audioNotice && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
                <span className="flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                  {audioNotice}
                </span>
                <button
                  onClick={() => setAudioNotice(null)}
                  className="text-[11px] font-bold text-amber-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {QUICK.slice(0, 4).map((q) => (
                <button
                  key={q.q}
                  onClick={() => send(q.q)}
                  className="chip shrink-0 border border-slate-200 bg-white text-slate-600"
                >
                  {q.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={toggleDictation}
                title={dictating ? "Stop mic dictation" : "Dictate with microphone"}
                className={`rounded-xl border p-3 transition ${
                  dictating
                    ? "border-rose-300 bg-rose-50 text-rose-600 animate-pulse"
                    : "border-slate-200 bg-white text-slate-600 hover:border-aqua-400 hover:text-ink-900"
                }`}
              >
                {dictating ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={transcribing}
                title="Upload audio note (Whisper /api/transcribe)"
                className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:border-aqua-400 hover:text-ink-900 disabled:opacity-50"
              >
                <Upload size={17} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  dictating
                    ? "Listening… speak now"
                    : transcribing
                    ? "Transcribing audio note…"
                    : "Ask Sophie anything… e.g. 'What did I earn last month?' or 'remember that I bank with CBZ'"
                }
                className="input flex-1 py-3"
              />
              <button type="submit" disabled={thinking || !input.trim()} className="btn-primary px-5 py-3">
                <Send size={17} />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
