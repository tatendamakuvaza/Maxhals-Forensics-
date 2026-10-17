// ─── Sophie — in-app financial AI assistant ──────────────────────────────────
// Finance-aware conversational engine with persistent memory, multi-turn context,
// statutory calculators, affordability analysis, and voice-friendly helpers.
// Can hand off to or augment with an LLM when OPENAI_API_KEY is configured.

import { AppData, SophieFact, SophieMemory, SophieTone } from "./types";
import {
  computePnL,
  computeBalanceSheet,
  computeCashFlow,
  computeEquity,
  receivablesAging,
  invoiceTotals,
  accountBalances
} from "./accounting";
import { calcPaye, calcAidsLevy, calcNssa } from "./tax";
import { fmtUSD, fmtPct, pct } from "./format";

export interface SophieTurn {
  reply: string;
  source: "memory" | "local" | "fallback";
  memory: SophieMemory;
  callRequested?: boolean;
}

const MONTH_LOOKUP: Record<string, { num: string; name: string }> = {
  jan: { num: "01", name: "January" },
  january: { num: "01", name: "January" },
  feb: { num: "02", name: "February" },
  february: { num: "02", name: "February" },
  mar: { num: "03", name: "March" },
  march: { num: "03", name: "March" },
  apr: { num: "04", name: "April" },
  april: { num: "04", name: "April" },
  may: { num: "05", name: "May" },
  jun: { num: "06", name: "June" },
  june: { num: "06", name: "June" },
  jul: { num: "07", name: "July" },
  july: { num: "07", name: "July" },
  aug: { num: "08", name: "August" },
  august: { num: "08", name: "August" },
  sep: { num: "09", name: "September" },
  sept: { num: "09", name: "September" },
  september: { num: "09", name: "September" },
  oct: { num: "10", name: "October" },
  october: { num: "10", name: "October" },
  nov: { num: "11", name: "November" },
  november: { num: "11", name: "November" },
  dec: { num: "12", name: "December" },
  december: { num: "12", name: "December" }
};

const GREETING_START =
  /^(?:good\s+(morning|afternoon|evening|day)|hi(?:ya)?|hie|hello|hey(?:\s+there)?|howdy|greetings|yo|sup|what(?:'?s|\s+is)\s+up|salibonani|mhoro(?:i)?|mangwanani|masikati|manheru|sawubona|g'?day)\b[\s,!.?\-–—]*/i;

const SMALL_TALK =
  /^(?:how\s+are\s+you(?:\s+doing)?|how'?re\s+you(?:\s+doing)?|how\s+is\s+it\s+going|how'?s\s+it\s+going|how\s+are\s+things|how(?:'?s|\s+is)\s+everything|how(?:'?s|\s+is)\s+your\s+day|what(?:'?s|\s+is)\s+up|you\s+good|you\s+okay|are\s+you\s+okay|are\s+you\s+good|nice\s+to\s+meet\s+you|pleased\s+to\s+meet\s+you|good\s+to\s+see\s+you|hope\s+you(?:'re|\s+are)\s+well)(?:\s+(?:today|tonight|this\s+(?:morning|afternoon|evening)|sophie))?[\s?!.]*$/i;

const ACKNOWLEDGEMENT =
  /^(?:ok(?:ay)?|k+|got\s+it|gotcha|cool|great|nice|awesome|perfect|sweet|alright|all\s+right|understood|makes\s+sense|fair\s+enough|noted|roger(?:\s+that)?|copy(?:\s+that)?|sounds\s+good|good\s+to\s+know|sure(?:\s+thing)?|yep|yeah|yes|yup|no\s+problem|np|right|fine|dope|lovely|brilliant|wonderful|super|amazing|fantastic|excellent|true|indeed|bet|word|hmm+|aha|oh(?:\s+ok(?:ay)?)?|i\s+see|ok(?:ay)?\s+thanks|cool\s+thanks)(?:\s+sophie)?[\s!.]*$/i;

const THANKS_RE =
  /^(?:thanks(?:\s+a\s+lot|\s+so\s+much|\s+million)?|thank\s*you(?:\s+so\s+much|\s+very\s+much)?|many\s+thanks|cheers|much\s+appreciated|i\s+appreciate\s+it|appreciate\s+it|thx|ty|tatenda|mazvita|ngiyabonga)(?:\s+sophie)?[\s!.,]*$/i;

const APOLOGY_RE =
  /^(?:sorry|so\s+sorry|(?:i'?m|i\s+am)\s+sorry|my\s+bad|apologies|my\s+apologies|i\s+apologise|i\s+apologize|oops|whoops|pardon(?:\s+me)?|excuse\s+me|forgive\s+me|no\s+worries)(?:\s+sophie)?[\s!.,]*$/i;

const GOODBYE_RE =
  /^(?:bye(?:\s+bye|\s+for\s+now)?|good\s*bye|see\s+you(?:\s+later|\s+soon)?|see\s+ya|later|catch\s+you\s+later|talk\s+(?:to\s+you\s+)?(?:soon|later)|ttyl|have\s+a\s+(?:good|great|nice)\s+(?:day|evening|night|one)|good\s*night|take\s+care|cya|peace(?:\s+out)?|signing\s+off|that(?:'?s|\s+is)\s+all(?:\s+for\s+now)?|nothing\s+else|(?:i'?m|i\s+am)\s+done|hang\s+up|end\s+call)(?:\s+sophie)?[\s!.,]*$/i;

const REUNION_RE =
  /\b(?:long\s+time\s+no\s+see|been\s+a\s+while|it(?:'?s|\s+has)\s+been\s+a\s+while|haven'?t\s+(?:talked|seen\s+you|chatted)\s+in\s+a\s+while|(?:i'?m|i\s+am)\s+back|back\s+again|missed\s+you)\b/i;

export function isGoodbyePhrase(text: string): boolean {
  const cleaned = text.trim().replace(/^sophie[\s,!-]*/i, "");
  return GOODBYE_RE.test(cleaned) || /\b(?:goodbye|good\s+bye|hang\s+up|end\s+the\s+call|end\s+call|that'?s\s+all\s+thank\s+you)\b/i.test(cleaned);
}

export function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[•\-–—]\s*/gm, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✓⚠️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureMemory(data: AppData): SophieMemory {
  if (!data.sophieMemory) {
    data.sophieMemory = { facts: [] };
  } else if (!Array.isArray(data.sophieMemory.facts)) {
    data.sophieMemory.facts = [];
  }
  return data.sophieMemory;
}

function applyTone(reply: string, tone?: SophieTone): string {
  if (tone === "formal") {
    return reply
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\bHey\b/g, "Hello")
      .replace(/!\s*/g, ". ")
      .replace(/\.\./g, ".")
      .replace(/  +/g, " ")
      .trim();
  }
  if (tone === "concise") {
    const lines = reply.split("\n").filter((l) => l.trim().length > 0);
    return lines.slice(0, 4).join("\n");
  }
  return reply;
}

function stripAddressingPrefix(input: string, ownerFullName: string): string {
  const escapedOwner = ownerFullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ownerParts = ownerFullName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const nameAlternation = [escapedOwner, ...ownerParts, "sophie\\s+ai", "sophie", "there", "again", "boss", "chief", "friend", "my\\s+friend", "sir", "ma'?am", "madam", "team"]
    .filter(Boolean)
    .join("|");
  const re = new RegExp(
    `^(?:(?:mr|mrs|ms|miss|dr|prof)\\.?\\s+)?(?:${nameAlternation})\\b[\\s,!.?\\-–—]*`,
    "i"
  );
  let rest = input.trim().replace(/^[\s,!.?\-–—]+/, "");
  // Strip up to two addressing tokens (e.g. "Mr Makuvaza, Sophie")
  for (let i = 0; i < 2; i++) {
    const next = rest.replace(re, "").replace(/^[\s,!.?\-–—]+/, "").trim();
    if (next === rest) break;
    rest = next;
  }
  return rest;
}

export function sophieTurn(question: string, data: AppData): SophieTurn {
  const memory = ensureMemory(data);
  const raw = question.trim();
  let q = raw.toLowerCase().trim();

  const pnl = computePnL(data);
  const bs = computeBalanceSheet(data);
  const cf = computeCashFlow(data);
  const eq = computeEquity(data);

  const ownerFull = data.settings.company.owner?.trim() || "Tatenda Makuvaza";
  const defaultFirst = ownerFull.split(/\s+/)[0] || "there";
  const userName = memory.preferredName?.trim() || defaultFirst;

  const hasBooks =
    data.income.length + data.expenses.length + data.invoices.length + data.bankTxns.length > 0;
  const unpaidTaxes = data.taxes
    .filter((t) => t.paidAmount < t.amount)
    .reduce((a, b) => a + (b.amount - b.paidAmount), 0);
  const openInvoices = data.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft");
  const totalReceivables = openInvoices.reduce((a, i) => a + Math.max(0, invoiceTotals(i).total - i.paidAmount), 0);
  const openFraud = data.fraudFlags.filter((f) => f.status === "open");

  const finish = (
    reply: string,
    source: SophieTurn["source"] = "local",
    callRequested?: boolean
  ): SophieTurn => ({
    reply: applyTone(reply, memory.tone),
    source,
    memory: { ...memory, facts: [...memory.facts] },
    ...(callRequested ? { callRequested: true } : {})
  });

  // ─── 1. Voice call request ("Sophie, call me" / "call me now" / "ring me") ──
  const callMeRe =
    /^(?:sophie[\s,!-]*)?(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:call\s+me(?:\s+now|\s+back|\s+on\s+(?:the\s+)?phone|\s+please)?|give\s+me\s+a\s+(?:call|ring)|ring\s+me(?:\s+now)?|phone\s+me(?:\s+now)?|start\s+(?:a\s+)?(?:voice\s+|phone\s+)?call|incoming\s+call)[\s!?.]*$/i;
  if (callMeRe.test(raw)) {
    return finish(
      `📞 Calling you right now, **${userName}**! Answer the incoming call banner on your screen and we can talk hands-free.`,
      "local",
      true
    );
  }

  // ─── 2. Learning & Memory commands (returns source: "memory") ──────────────
  // 2a. Clear all memory ("Forget everything", "clear memory", "reset memory")
  if (
    /^(?:sophie[\s,!-]*)?(?:please\s+)?(?:forget\s+(?:everything|all(?:\s+of\s+that)?|what\s+i\s+(?:told|taught)\s+you)|clear\s+(?:your\s+)?memory|reset\s+(?:your\s+)?memory|wipe\s+(?:your\s+)?memory|erase\s+(?:your\s+)?memory)[\s!?.]*$/i.test(
      raw
    )
  ) {
    memory.preferredName = undefined;
    memory.tone = undefined;
    memory.facts = [];
    data.sophieMemory = memory;
    return finish(
      `🧹 Done — I've cleared everything you taught me (preferred name, tone preferences and saved notes). Your financial books weren't touched.`,
      "memory"
    );
  }

  // 2b. Inspect memory ("What do you remember?", "What have you learned?", "Show memory")
  if (
    /\b(?:what\s+do\s+you\s+remember|what\s+have\s+you\s+learned|what\s+did\s+i\s+teach\s+you|what\s+do\s+you\s+know\s+about\s+me\s+from\s+memory|show\s+(?:your\s+)?memory|list\s+(?:your\s+)?memory|your\s+memories|what'?s\s+in\s+your\s+memory)\b/i.test(
      raw
    )
  ) {
    const items: string[] = [];
    if (memory.preferredName) items.push(`• **Preferred name:** ${memory.preferredName}`);
    if (memory.tone) items.push(`• **Conversation style:** ${memory.tone}`);
    memory.facts.forEach((f) => items.push(`• ${f.text}`));
    if (items.length === 0) {
      return finish(
        `🧠 My memory bank is clean right now, ${userName}. You can teach me anytime:\n• *"call me T"*\n• *"be more formal"* or *"be casual"*\n• *"remember that I bank with CBZ"*\n• *"learn: credit policy = 30-day terms"*`,
        "memory"
      );
    }
    return finish(
      `🧠 **Here is what I remember (${items.length} ${items.length === 1 ? "item" : "items"}):**\n${items.join("\n")}\n\nSay **"Forget everything"** whenever you want to clear this.`,
      "memory"
    );
  }

  // 2c. Preferred name ("call me T", "please call me Chief", "my name is T")
  const callMeNameMatch = raw.match(
    /^(?:sophie[\s,!-]*)?(?:please\s+)?(?:you\s+can\s+)?(?:call\s+me|refer\s+to\s+me\s+as|address\s+me\s+as|my\s+name\s+is|i\s+go\s+by)\s+([a-zA-Z0-9][a-zA-Z0-9\s.'-]{0,32}?)[\s!?.]*$/i
  );
  if (callMeNameMatch) {
    const candidate = callMeNameMatch[1].trim();
    const bannedCallWords = /^(?:now|back|later|today|tonight|tomorrow|maybe|sometime|soon|again|please|on\s+the\s+phone|on\s+phone|by\s+phone|right\s+now|when\s+you\s+can)$/i;
    if (!bannedCallWords.test(candidate)) {
      memory.preferredName = candidate;
      data.sophieMemory = memory;
      return finish(
        `🧠 Got it — I'll call you **${candidate}** from now on!`,
        "memory"
      );
    }
  }

  // 2d. Tone preference ("be more formal", "be casual", "be concise", "be warm")
  const toneMatch = raw.match(
    /^(?:sophie[\s,!-]*)?(?:please\s+)?(?:can\s+you\s+)?(?:be(?:\s+more|\s+a\s+bit\s+more)?|speak(?:\s+more)?|talk(?:\s+more)?|use\s+a(?:\s+more)?|switch\s+to(?:\s+a)?)\s+(formal|professional|casual|friendly|relaxed|informal|concise|brief|short|warm|normal)(?:\s+tone|\s+style)?[\s!?.]*$/i
  );
  if (toneMatch) {
    const word = toneMatch[1].toLowerCase();
    const nextTone: SophieTone =
      word === "formal" || word === "professional"
        ? "formal"
        : word === "casual" || word === "friendly" || word === "relaxed" || word === "informal"
        ? "casual"
        : word === "concise" || word === "brief" || word === "short"
        ? "concise"
        : "warm";
    memory.tone = nextTone;
    data.sophieMemory = memory;
    return finish(
      `🧠 Understood, ${userName}. I've updated my response style to **${nextTone}**.`,
      "memory"
    );
  }

  // 2e. Forget a specific fact ("forget that I bank with CBZ")
  const forgetFactMatch = raw.match(
    /^(?:sophie[\s,!-]*)?(?:please\s+)?forget\s+(?:that\s+|about\s+)?(.+?)[\s!?.]*$/i
  );
  if (forgetFactMatch && !/^(?:everything|all|it)$/i.test(forgetFactMatch[1].trim())) {
    const needle = forgetFactMatch[1].trim().toLowerCase();
    const before = memory.facts.length;
    memory.facts = memory.facts.filter((f) => !f.text.toLowerCase().includes(needle));
    data.sophieMemory = memory;
    const removed = before - memory.facts.length;
    return finish(
      removed > 0
        ? `🧹 I've forgotten ${removed} saved ${removed === 1 ? "note" : "notes"} matching "${forgetFactMatch[1].trim()}".`
        : `🧠 I didn't have a saved note matching "${forgetFactMatch[1].trim()}", ${userName}. Ask **"What do you remember?"** to see everything I've stored.`,
      "memory"
    );
  }

  // 2f. Learn / remember a fact ("remember that I bank with CBZ", "learn: credit policy = 30-day terms")
  const learnMatch = raw.match(
    /^(?:sophie[\s,!-]*)?(?:please\s+)?(?:remember(?:\s+that)?|learn(?:\s+that)?|teach\s+you(?:\s+that)?|note\s+that|keep\s+in\s+mind(?:\s+that)?|don'?t\s+forget(?:\s+that)?|save\s+note|fact)\s*[:\-–—]?\s+(.+)$/i
  ) || raw.match(/^(?:remember|learn|teach|fact)\s*:\s*(.+)$/i);
  if (learnMatch) {
    const factText = learnMatch[1].trim().replace(/[.!]+$/, "");
    if (factText.length > 0) {
      const kv = factText.match(/^([^=:]{2,40}?)\s*(?:=|:|\bis\b)\s*(.+)$/i);
      const key = kv ? kv[1].trim().toLowerCase() : undefined;
      const existingIdx = memory.facts.findIndex(
        (f) => f.text.toLowerCase() === factText.toLowerCase() || (key && f.key === key)
      );
      const entry: SophieFact = {
        id: `MEM-${Date.now()}`,
        key,
        text: factText,
        createdAt: Date.now()
      };
      if (existingIdx >= 0) {
        memory.facts[existingIdx] = entry;
      } else {
        memory.facts.push(entry);
      }
      data.sophieMemory = memory;
      return finish(
        `🧠 Saved to memory, **${userName}**: *"${factText}"*.\nYou can ask **"What do you remember?"** anytime to review what I've learned.`,
        "memory"
      );
    }
  }

  // ─── 3. Greetings & Small Talk ─────────────────────────────────────────────
  const sayHello = (partOfDay?: string, askedHow = false) => {
    const salutation = partOfDay
      ? `Good ${partOfDay.toLowerCase()}`
      : memory.tone === "formal"
      ? "Greetings"
      : "Hello";
    const mood = askedHow
      ? "I'm doing great and all systems are green — thanks for asking!"
      : "It's great to hear from you.";
    const booksLine = hasBooks
      ? `Your books are live: **${fmtUSD(pnl.totalIncome)}** income YTD, **${fmtUSD(pnl.netProfit)}** net profit, and **${fmtUSD(bs.assets[0].amount)}** in cash & bank.`
      : "Your books are clean right now — every ledger sits at zero until you record your first client, invoice or expense.";
    return `${salutation}, ${userName}! 👋 ${mood} I'm Sophie, your Maxhals Forensics financial assistant.\n\n${booksLine}\n\nAsk me about profit, monthly earnings/spending, cash flow, who owes you the most, VAT/NSSA/PAYE, affordability, or any quick calculation.`;
  };

  // Reunion ("long time no see", "it's been a while", "I'm back")
  if (REUNION_RE.test(q)) {
    return finish(
      `Welcome back, **${userName}**! 👋 It's great to have you back in the command suite.\n\nWhile you were away I kept an eye on the books:\n• Revenue YTD: **${fmtUSD(pnl.totalIncome)}** · Net profit: **${fmtUSD(pnl.netProfit)}**\n• Cash & bank: **${fmtUSD(bs.assets[0].amount)}**\n• Open receivables: **${fmtUSD(totalReceivables)}** across ${openInvoices.length} invoices\n• Statutory payables due: **${fmtUSD(unpaidTaxes)}**\n\nWhere would you like to pick up?`
    );
  }

  // Strip leading greeting and check what's left
  const greeting = raw.match(GREETING_START);
  if (greeting) {
    const afterGreeting = stripAddressingPrefix(raw.slice(greeting[0].length), ownerFull);
    if (!afterGreeting || SMALL_TALK.test(afterGreeting)) {
      const part = greeting[1] ? greeting[1].toLowerCase() : undefined;
      return finish(sayHello(part === "day" ? "afternoon" : part, !!afterGreeting));
    }
    q = afterGreeting.toLowerCase().trim();
  } else {
    const stripped = stripAddressingPrefix(raw, ownerFull);
    if (stripped && SMALL_TALK.test(stripped)) {
      return finish(sayHello(undefined, true));
    }
  }

  if (SMALL_TALK.test(q)) {
    return finish(sayHello(undefined, true));
  }

  // ─── 4. Acknowledgements, Thanks, Apologies, Goodbyes ──────────────────────
  if (THANKS_RE.test(q)) {
    return finish(
      `You're very welcome, ${userName}! 😊 I'm right here whenever you want to check the numbers or run a calculation.`
    );
  }

  if (APOLOGY_RE.test(q)) {
    return finish(
      `No problem at all, ${userName}! 😊 Nothing to apologise for — how can I help you with your finances today?`
    );
  }

  if (GOODBYE_RE.test(q)) {
    return finish(
      `Goodbye, ${userName}! 👋 Have a productive day — I'll keep monitoring your ledgers, invoices and fraud alerts while you're away.`
    );
  }

  if (ACKNOWLEDGEMENT.test(q)) {
    return finish(
      `Sounds good, ${userName}! 👍 Let me know whenever you want to check another figure, run a tax calculation, or review your invoices.`
    );
  }

  // ─── 5. Mood check-ins & Empathy ───────────────────────────────────────────
  if (
    /\b(?:worried\s+about\s+(?:money|cash|finances|bills|debt)|anxious\s+about\s+(?:money|cash|finances|bills)|stressed\s+about\s+(?:money|cash|finances|bills)|money\s+is\s+tight|cash\s+is\s+tight|short\s+on\s+cash|struggling\s+financially|(?:i'?m|i\s+am)\s+broke|financial\s+stress|scared\s+about\s+money)\b/i.test(
      q
    )
  ) {
    const overdue = openInvoices.filter((i) => i.status === "overdue");
    return finish(
      `Take a breath, ${userName} — let's look at the hard facts together so you have a clear plan:\n• **Cash in bank right now:** ${fmtUSD(bs.assets[0].amount)}\n• **Money owed to you (receivables):** ${fmtUSD(totalReceivables)} across ${openInvoices.length} open invoices${overdue.length ? ` (${overdue.length} overdue)` : ""}\n• **Statutory bills due:** ${fmtUSD(unpaidTaxes)}\n• **Net profit YTD:** ${fmtUSD(pnl.netProfit)}\n\n💡 **Immediate next step:** ${totalReceivables > 0 ? `collecting your open invoices adds **${fmtUSD(totalReceivables)}** straight to cash — start by chasing the top overdue debtor via WhatsApp.` : "keep non-essential expenses paused and bill any open client work first."}`
    );
  }

  if (
    /\b(?:(?:i'?m|i\s+am|feeling)\s+(?:so\s+|very\s+|really\s+)?(?:tired|exhausted|beat|wiped|stressed|overwhelmed|burned\s+out|burnt\s+out)|what\s+a\s+(?:long|tough|rough|hard|bad)\s+day|(?:long|tough|rough|bad)\s+day|need\s+a\s+break|need\s+sleep|have\s+a\s+headache)\b/i.test(
      q
    )
  ) {
    return finish(
      `I hear you, ${userName} — take a well-deserved breather. 💙 Your books are safely reconciled:\n• Cash position is **${fmtUSD(bs.assets[0].amount)}** and YTD net profit stands at **${fmtUSD(pnl.netProfit)}**.\n• Open fraud alerts: **${openFraud.length}**.\n\nStep away and rest; I can give you a 10-second executive summary whenever you're ready.`
    );
  }

  if (
    /^(?:(?:i'?m|i\s+am)\s+(?:happy|good|great|fine|doing\s+well|doing\s+great|doing\s+good|excited|pumped|all\s+good|okay|ok)|feeling\s+(?:good|great|happy|awesome|blessed)|doing\s+(?:well|great|good|fine)|not\s+bad|can'?t\s+complain|all\s+is\s+well)[\s!.]*$/i.test(
      q
    )
  ) {
    return finish(
      `Love to hear that, ${userName}! 🙌 Your numbers match the energy — **${fmtUSD(pnl.netProfit)}** net profit YTD on **${fmtUSD(pnl.totalIncome)}** revenue. What shall we tackle today?`
    );
  }

  if (
    /\b(?:(?:i'?m|i\s+am|feeling)\s+(?:so\s+|a\s+bit\s+)?(?:sad|down|frustrated|annoyed|confused|lost|bored|stuck))\b/i.test(
      q
    )
  ) {
    return finish(
      `I'm right here with you, ${userName}. Whenever things feel noisy, we can break the numbers down one piece at a time — ask me *"How am I doing?"* for a clean snapshot or *"What should I focus on?"* for your top 3 priorities.`
    );
  }

  // ─── 6. Multi-turn references ("tell me more", "why?", "repeat that") ──────
  const history = Array.isArray(data.chat) ? data.chat : [];
  const lastSophie = [...history].reverse().find((m) => m.role === "sophie");
  const prevUserMsgs = history.filter((m) => m.role === "user");
  const lastUser = prevUserMsgs.length > 0 ? prevUserMsgs[prevUserMsgs.length - 1] : undefined;

  if (
    /^(?:repeat(?:\s+that)?|say\s+that\s+again|what\s+did\s+you\s+(?:just\s+)?say|can\s+you\s+repeat(?:\s+that)?|come\s+again|pardon\??)[\s!?.]*$/i.test(
      q
    )
  ) {
    if (lastSophie) {
      return finish(`Here's what I just shared, ${userName}:\n\n${lastSophie.text}`);
    }
    return finish(
      `We just started our conversation, ${userName}! Ask me about profit, cash flow, invoices, taxes or fraud alerts and I'll walk you through the numbers.`
    );
  }

  if (
    /^(?:tell\s+me\s+more|more\s+details?|elaborate|explain\s+more|go\s+on|continue|keep\s+going|break\s+it\s+down|expand(?:\s+on\s+that)?|give\s+me\s+more|what\s+else|anything\s+else)[\s!?.]*$/i.test(
      q
    ) ||
    /^(?:why|why\s+is\s+that|how\s+come|what\s+does\s+that\s+mean|how\s+did\s+you\s+(?:calculate|get)\s+that|where\s+does\s+that\s+come\s+from|explain\s+that)[\s!?.]*$/i.test(
      q
    )
  ) {
    const isWhy = /^(?:why|how\s+come|what\s+does\s+that\s+mean|how\s+did\s+you|where\s+does|explain\s+that)/i.test(q);
    const contextText = `${lastSophie?.text ?? ""} ${lastUser?.text ?? ""}`.toLowerCase();

    if (contextText.includes("receivable") || contextText.includes("invoice") || contextText.includes("owe")) {
      const byClient = new Map<string, number>();
      openInvoices.forEach((inv) => {
        const cname = data.clients.find((c) => c.id === inv.clientId)?.name ?? inv.clientId;
        const bal = Math.max(0, invoiceTotals(inv).total - inv.paidAmount);
        byClient.set(cname, (byClient.get(cname) ?? 0) + bal);
      });
      const ranked = [...byClient.entries()].sort((a, b) => b[1] - a[1]);
      return finish(
        `🔎 **Deeper look at your receivables (${fmtUSD(totalReceivables)} total):**\n` +
          (ranked.length
            ? ranked.map(([c, amt]) => `• **${c}:** ${fmtUSD(amt)} outstanding`).join("\n")
            : "• No unpaid client balances.") +
          `\n\n${isWhy ? "These balances come from sent/overdue invoices where `invoice total (incl. 15% VAT) minus paidAmount` is still positive." : "Collecting the top two accounts alone would boost your bank balance significantly."}`
      );
    }

    if (contextText.includes("vat") || contextText.includes("nssa") || contextText.includes("paye") || contextText.includes("statutory") || contextText.includes("zimra")) {
      const unpaidList = data.taxes.filter((t) => t.paidAmount < t.amount);
      return finish(
        `🔎 **Statutory breakdown (${fmtUSD(unpaidTaxes)} unpaid):**\n` +
          (unpaidList.length
            ? unpaidList
                .map((t) => `• **${t.type} (${t.period}):** ${fmtUSD(t.amount - t.paidAmount)} due ${t.dueDate} — ${t.notes}`)
                .join("\n")
            : "• All VAT, NSSA and PAYE returns are settled ✓") +
          `\n\n${isWhy ? "This figure sums `amount - paidAmount` across every open return in your Tax Register (`Taxes` page)." : "Settling PAYE and NSSA before the 15th avoids ZIMRA penalties and interest."}`
      );
    }

    if (contextText.includes("cash") || contextText.includes("bank") || contextText.includes("afford")) {
      return finish(
        `🔎 **How your cash position (${fmtUSD(bs.assets[0].amount)}) is built:**\n` +
          data.bankAccounts.map((b) => `• **${b.bank} (${b.name}):** opening ${fmtUSD(b.openingBalance)}`).join("\n") +
          `\n• **Net bank transactions:** ${fmtUSD(cf.net)} (inflows vs outflows across ${data.bankTxns.length} entries)\n• **Closing bank & cash:** **${fmtUSD(cf.closing)}**\n• **Free cash after unpaid taxes (${fmtUSD(unpaidTaxes)}):** **${fmtUSD(bs.assets[0].amount - unpaidTaxes)}**`
      );
    }

    if (contextText.includes("fraud") || contextText.includes("anomaly") || contextText.includes("flag")) {
      return finish(
        `🔎 **How the MHF-IF v2.1 fraud engine scored those flags:**\n• Combines a 24-tree Isolation Forest over 7 transaction features with statistical z-scores and forensic rules (round amounts, weekend postings, unmatched bank entries, duplicate narrations).\n• Currently **${data.fraudFlags.length}** transactions are flagged (${openFraud.length} open).\n• Review or dismiss individual items in **Fraud Monitor** in the sidebar.`
      );
    }

    // Default deep dive: P&L + drivers
    const topExp = pnl.expensesByCategory.slice(0, 3);
    return finish(
      `🔎 **Here is the full breakdown behind your numbers, ${userName}:**\n` +
        `• **Total revenue (${fmtUSD(pnl.totalIncome)}):** Forensic Audit ${fmtUSD(pnl.incomeByStream.forensic)} (${fmtPct(pct(pnl.incomeByStream.forensic, pnl.totalIncome))}), Salary ${fmtUSD(pnl.incomeByStream.salary)} (${fmtPct(pct(pnl.incomeByStream.salary, pnl.totalIncome))}), Seminars ${fmtUSD(pnl.incomeByStream.seminar)} (${fmtPct(pct(pnl.incomeByStream.seminar, pnl.totalIncome))}).\n` +
        `• **Top cost drivers (${fmtUSD(pnl.totalExpenses)} total):** ${topExp.map((e) => `${e.category} ${fmtUSD(e.amount)}`).join(" · ") || "none recorded"}.\n` +
        `• **Net profit (${fmtUSD(pnl.netProfit)}):** computed as Total Income minus Total Operating & Direct Expenses (net margin **${fmtPct(pct(pnl.netProfit, pnl.totalIncome))}**).\n` +
        `• **Cash vs Profit gap:** ${fmtUSD(totalReceivables)} is still tied up in unpaid client invoices.`
    );
  }

  // ─── 7. User identity, assistant status & learned fact recall ──────────────
  // "What is my name?", "Do you know me?", "Who am I?"
  if (
    /\b(?:what\s+is\s+my\s+name|what'?s\s+my\s+name|who\s+am\s+i|do\s+you\s+know\s+me|do\s+you\s+know\s+who\s+i\s+am|tell\s+me\s+about\s+myself|what\s+is\s+my\s+company|what'?s\s+my\s+company|where\s+am\s+i\s+based|what\s+is\s+my\s+email|what\s+is\s+my\s+phone)\b/i.test(
      q
    )
  ) {
    const c = data.settings.company;
    const prefNote = memory.preferredName
      ? ` (and you asked me to call you **${memory.preferredName}**)`
      : "";
    const learnedLine =
      memory.facts.length > 0
        ? `\n• **Saved notes:** ${memory.facts.map((f) => f.text).join(" · ")}`
        : "";
    return finish(
      `Of course I know you! 😊\n• **Name:** **${c.owner}**${prefNote}\n• **Company:** ${c.name} — *${c.tagline}*\n• **Contact:** ${c.email} · ${c.phone} (WhatsApp ${data.settings.whatsappNumber})\n• **Address:** ${c.address}\n• **Tax & Statutory:** VAT ${c.vatNumber} · NSSA ${c.nssaNumber} · TIN ${c.taxNumber}${learnedLine}`
    );
  }

  // "What are you doing?", "What's going on?", "What's happening?", "Are you there?"
  if (
    /\b(?:what\s+are\s+you\s+doing|what'?s\s+going\s+on|what\s+is\s+going\s+on|what'?s\s+happening|what\s+is\s+happening|what\s+are\s+you\s+up\s+to|what'?s\s+new|whats\s+new|are\s+you\s+there|are\s+you\s+awake|are\s+you\s+online|can\s+you\s+hear\s+me|testing|mic\s+check)\b/i.test(
      q
    ) ||
    /^(?:test|1\s*2\s*3)$/i.test(q)
  ) {
    return finish(
      `🟢 I'm online and watching your live Maxhals Forensics books right now, **${userName}**:\n• **Ledger & P&L:** ${data.income.length} income records (${fmtUSD(pnl.totalIncome)}) and ${data.expenses.length} expenses (${fmtUSD(pnl.totalExpenses)}) → **${fmtUSD(pnl.netProfit)}** net profit.\n• **Cash & Bank:** **${fmtUSD(bs.assets[0].amount)}** across ${data.bankAccounts.length} bank accounts.\n• **Receivables:** ${openInvoices.length} open invoices worth **${fmtUSD(totalReceivables)}**.\n• **Fraud ML:** ${openFraud.length} open anomaly ${openFraud.length === 1 ? "flag" : "flags"}.\n\nWhat would you like to inspect first?`
    );
  }

  // Check if the question matches a learned memory fact
  if (memory.facts.length > 0) {
    const cleanedWords = q
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["what", "who", "where", "when", "how", "which", "does", "did", "the", "and", "for", "with", "about", "tell", "show", "can", "you", "your", "mine", "our"].includes(w));
    const matchedFact = memory.facts.find((f) => {
      if (f.key && q.includes(f.key.toLowerCase())) return true;
      const ft = f.text.toLowerCase();
      return cleanedWords.length > 0 && cleanedWords.some((w) => ft.includes(w)) &&
        /\b(?:what|who|where|which|when|how|policy|bank|remember|my|our)\b/.test(q);
    });
    if (matchedFact && !/\b(?:profit|balance\s+sheet|cash\s+flow|fraud|overdue\s+invoice)\b/.test(q)) {
      return finish(
        `🧠 From what you taught me, **${userName}**: **${matchedFact.text}**.\n\n(Ask *"What do you remember?"* to see all saved notes.)`,
        "memory"
      );
    }
  }

  const hit = (...keys: string[]) => keys.some((k) => q.includes(k));

  // Assistant identity / help
  if (
    hit(
      "who are you",
      "your name",
      "what's your name",
      "what is your name",
      "what can you do",
      "help",
      "abilities",
      "capabilities",
      "features",
      "commands",
      "are you human",
      "are you an ai",
      "are you a robot",
      "who made you",
      "who created you",
      "who built you",
      "how do you work"
    )
  ) {
    return finish(
      `I'm **Sophie** 🤖 — your AI financial analyst inside the Maxhals Forensics Suite, built for **${ownerFull}**. I can:\n• Summarise P&L, financial position, cash flow, net worth & equity\n• Break down any month's earnings or spending (e.g. *"What did I earn last month?"*, *"What did I spend in September?"*)\n• Rank debtors & clients (*"Which client owes me the most?"*)\n• Answer payable & affordability questions (*"How much do I owe?"*, *"Can I afford a laptop for 2500?"*)\n• Compute VAT, PAYE, NSSA & net salary or any arithmetic (*"PAYE on 2500"*, *"what is 1200 + 3400?"*)\n• Learn your preferences (*"call me T"*, *"remember that I bank with CBZ"*)\n• Talk via live browser voice call or Twilio phone webhook!`
    );
  }

  // Date / time questions
  if (hit("what time", "what day", "today's date", "todays date", "what date", "current date", "what year")) {
    const now = new Date();
    return finish(
      `📅 Today is **${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}** (${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}). We're in Q4 of the 2026 fiscal year.`
    );
  }

  // Joke / motivation / fun
  if (hit("joke", "make me laugh", "something funny", "laugh")) {
    return finish(
      `😄 Why did the forensic accountant cross the road?\nTo reconcile the chicken's movement with the general ledger — and flag an unmatched crossing on a Sunday! 🐔📊`
    );
  }

  if (hit("motivate me", "inspire me", "quote", "encouragement")) {
    return finish(
      `✨ *"In God we trust; all others must bring reconciled data."* — Keep pushing, **${userName}**! You've built **${fmtUSD(pnl.totalIncome)}** in revenue across 3 streams this year with a **${fmtPct(pct(pnl.netProfit, pnl.totalIncome))}** net profit margin.`
    );
  }

  // ─── 8. Statutory & Tax Calculators (VAT / PAYE / NSSA / Net pay) ──────────
  // 8a. PAYE / NSSA / Net salary calculator on a specific gross amount
  const payeCalcMatch =
    q.match(/(?:calculate\s+|compute\s+|what\s+is\s+|how\s+much\s+(?:is\s+)?)?(?:paye|income\s+tax|payroll\s+tax|net\s+salary|net\s+pay|take\s*home(?:\s+pay)?)\s+(?:on|for|of|at)\s+\$?([\d,]+(?:\.\d+)?)/i) ||
    q.match(/\$?([\d,]+(?:\.\d+)?)\s+(?:gross\s+)?(?:salary|pay)\s+(?:paye|tax|net|nssa)/i);
  if (payeCalcMatch) {
    const gross = parseFloat(payeCalcMatch[1].replace(/,/g, ""));
    const nssa = calcNssa(gross, data.settings.nssaEmployeeRate, data.settings.nssaEmployerRate, data.settings.nssaCeiling);
    const taxable = Math.max(0, gross - nssa.employee);
    const paye = calcPaye(taxable);
    const aids = calcAidsLevy(paye);
    const net = Math.round((gross - nssa.employee - paye - aids) * 100) / 100;
    return finish(
      `🧮 **Payroll & PAYE calculation on ${fmtUSD(gross)} monthly gross:**\n• **NSSA Employee (${data.settings.nssaEmployeeRate}% capped at ${fmtUSD(data.settings.nssaCeiling)}):** ${fmtUSD(nssa.employee)}\n• **Taxable income:** ${fmtUSD(taxable)}\n• **PAYE:** **${fmtUSD(paye)}**\n• **AIDS Levy (3% of PAYE):** ${fmtUSD(aids)}\n• **Estimated Net Take-Home Pay:** **${fmtUSD(net)}**\n• *(Employer NSSA contribution @ ${data.settings.nssaEmployerRate}%: ${fmtUSD(nssa.employer)})*`
    );
  }

  const nssaCalcMatch = q.match(
    /(?:calculate\s+|compute\s+|what\s+is\s+|how\s+much\s+(?:is\s+)?)?nssa\s+(?:on|for|of|at)\s+\$?([\d,]+(?:\.\d+)?)/i
  );
  if (nssaCalcMatch) {
    const gross = parseFloat(nssaCalcMatch[1].replace(/,/g, ""));
    const nssa = calcNssa(gross, data.settings.nssaEmployeeRate, data.settings.nssaEmployerRate, data.settings.nssaCeiling);
    const insurable = Math.min(gross, data.settings.nssaCeiling);
    return finish(
      `🧮 **NSSA calculation on ${fmtUSD(gross)} gross (insurable earnings ${fmtUSD(insurable)}, ceiling ${fmtUSD(data.settings.nssaCeiling)}):**\n• **Employee (${data.settings.nssaEmployeeRate}%):** **${fmtUSD(nssa.employee)}**\n• **Employer (${data.settings.nssaEmployerRate}%):** **${fmtUSD(nssa.employer)}**\n• **Total NSSA remittance:** **${fmtUSD(nssa.employee + nssa.employer)}**`
    );
  }

  // 8b. Percentage / VAT on amount ("15% VAT on 4,500", "20% of 8000", "VAT on 3000")
  const cleanNumQ = q.replace(/,/g, "");
  const rateOnAmount = cleanNumQ.match(/(\d+(?:\.\d+)?)\s*%\s*(?:vat|tax)?\s*(?:on|of)\s*\$?(\d+(?:\.\d+)?)/);
  const amountAtRate = cleanNumQ.match(/(?:vat|tax)\s*(?:on|of)?\s*\$?(\d+(?:\.\d+)?)\s*at\s*(\d+(?:\.\d+)?)\s*%?/);
  const vatOnAmount = cleanNumQ.match(/(?:vat|tax)\s*(?:on|of|for)\s*\$?(\d+(?:\.\d+)?)/);
  if (
    rateOnAmount ||
    amountAtRate ||
    (vatOnAmount && !hit("owe", "payable", "due", "return", "zimra", "nssa", "paye", "statutory"))
  ) {
    const amount = rateOnAmount
      ? parseFloat(rateOnAmount[2])
      : amountAtRate
      ? parseFloat(amountAtRate[1])
      : parseFloat(vatOnAmount![1]);
    const rate = rateOnAmount
      ? parseFloat(rateOnAmount[1])
      : amountAtRate
      ? parseFloat(amountAtRate[2])
      : data.settings.vatRate;
    const res = Math.round(amount * rate) / 100;
    return finish(
      `🧮 ${rate}% on ${fmtUSD(amount)} = **${fmtUSD(res)}** (total with tax: **${fmtUSD(amount + res)}**, net if inclusive: ${fmtUSD(amount / (1 + rate / 100))}).`
    );
  }

  // 8c. Arithmetic anywhere ("what is 1200 + 3400?", "calculate (5000 - 1200) * 2")
  const normalizedMath = q
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/(\d)\s*[x×]\s*(\d)/gi, "$1 * $2")
    .replace(/(\d)\s*÷\s*(\d)/g, "$1 / $2")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b|\bmultiplied\s+by\b/g, "*")
    .replace(/\bdivided\s+by\b/g, "/");
  const exprMatch = normalizedMath.match(
    /(?:^|(?:what\s+is|what'?s|whats|calculate|compute|how\s+much\s+is|sum\s+of|add|equals?)\s+)([\d\s()+\-*/.]+?\d[\d\s()+\-*/.]*)(?:[\s?!=.]*)$/i
  );
  const bareArith = normalizedMath.match(/^[\d\s+\-*/().]+$/);
  const mathCandidate = exprMatch ? exprMatch[1].trim() : bareArith ? bareArith[0].trim() : null;
  if (
    mathCandidate &&
    /\d/.test(mathCandidate) &&
    /[+\-*/]/.test(mathCandidate) &&
    !/^\d{4}-\d{2}(?:-\d{2})?$/.test(mathCandidate) // not an ISO date
  ) {
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${mathCandidate})`)();
      if (typeof val === "number" && isFinite(val)) {
        return finish(`🧮 \`${mathCandidate.replace(/\s+/g, " ")}\` = **${fmtUSD(val)}** (${val.toLocaleString("en-US", { maximumFractionDigits: 4 })}).`);
      }
    } catch {
      /* fall through */
    }
  }

  // ─── 9. Monthly Earnings / Spending / Performance ("last month", "in September") ──
  const allMonths = [
    ...new Set([
      ...data.income.map((i) => i.date.slice(0, 7)),
      ...data.expenses.map((e) => e.date.slice(0, 7))
    ])
  ].sort();
  const latestMonth = allMonths[allMonths.length - 1] || "2026-10";
  const prevMonth =
    allMonths.length >= 2
      ? allMonths[allMonths.length - 2]
      : (() => {
          const [y, m] = latestMonth.split("-").map(Number);
          return m > 1 ? `${y}-${String(m - 1).padStart(2, "0")}` : `${y - 1}-12`;
        })();

  let targetPeriod: { ym: string; label: string } | null = null;
  if (/\blast\s+month\b|\bprevious\s+month\b/i.test(q)) {
    const mNum = prevMonth.slice(5, 7);
    const mName = Object.values(MONTH_LOOKUP).find((v) => v.num === mNum)?.name ?? prevMonth;
    targetPeriod = { ym: prevMonth, label: `${mName} ${prevMonth.slice(0, 4)} (last month)` };
  } else if (/\bthis\s+month\b|\bcurrent\s+month\b/i.test(q)) {
    const mNum = latestMonth.slice(5, 7);
    const mName = Object.values(MONTH_LOOKUP).find((v) => v.num === mNum)?.name ?? latestMonth;
    targetPeriod = { ym: latestMonth, label: `${mName} ${latestMonth.slice(0, 4)} (this month)` };
  } else {
    const monthWordMatch = q.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
    );
    if (monthWordMatch) {
      const info = MONTH_LOOKUP[monthWordMatch[1].toLowerCase()];
      if (info) {
        const year = latestMonth.slice(0, 4) || "2026";
        targetPeriod = { ym: `${year}-${info.num}`, label: `${info.name} ${year}` };
      }
    }
  }

  if (
    targetPeriod &&
    hit(
      "earn",
      "earned",
      "make",
      "made",
      "income",
      "revenue",
      "spend",
      "spent",
      "spending",
      "expense",
      "cost",
      "profit",
      "net",
      "how did i do",
      "how was",
      "summary",
      "performance",
      "numbers",
      "total",
      "much"
    )
  ) {
    const mIncome = data.income.filter((i) => i.date.startsWith(targetPeriod!.ym));
    const mExpenses = data.expenses.filter((e) => e.date.startsWith(targetPeriod!.ym));
    const incTotal = mIncome.reduce((a, b) => a + b.amount, 0);
    const expTotal = mExpenses.reduce((a, b) => a + b.amount, 0);
    const netTotal = incTotal - expTotal;

    const asksSpendOnly =
      hit("spend", "spent", "spending", "expense", "cost") &&
      !hit("earn", "earned", "make", "made", "income", "revenue", "profit");
    const asksEarnOnly =
      hit("earn", "earned", "make", "made", "income", "revenue") &&
      !hit("spend", "spent", "spending", "expense", "cost", "profit");

    if (asksSpendOnly) {
      return finish(
        `💸 **Spending in ${targetPeriod.label}: ${fmtUSD(expTotal)}** (${mExpenses.length} ${mExpenses.length === 1 ? "entry" : "entries"})\n` +
          (mExpenses.length
            ? mExpenses.map((e) => `• ${e.date} — **${e.category}:** ${fmtUSD(e.amount)} (${e.description})`).join("\n")
            : "• No expenses recorded for this month.") +
          `\n\nFor comparison, income in ${targetPeriod.label} was **${fmtUSD(incTotal)}**, leaving **${fmtUSD(netTotal)}** net profit.`
      );
    }

    if (asksEarnOnly) {
      return finish(
        `💰 **Earnings in ${targetPeriod.label}: ${fmtUSD(incTotal)}** (${mIncome.length} ${mIncome.length === 1 ? "entry" : "entries"})\n` +
          (mIncome.length
            ? mIncome
                .map(
                  (i) =>
                    `• ${i.date} — **${i.client}:** ${fmtUSD(i.amount)} (${i.description}${i.received ? " · received ✓" : " · invoiced/pending"})`
                )
                .join("\n")
            : "• No income recorded for this month.") +
          `\n\nOperating expenses in ${targetPeriod.label} were **${fmtUSD(expTotal)}**, giving a net profit of **${fmtUSD(netTotal)}**.`
      );
    }

    return finish(
      `📅 **${targetPeriod.label} performance summary**\n• **Income earned:** **${fmtUSD(incTotal)}** (${mIncome.length} ${mIncome.length === 1 ? "item" : "items"})\n• **Expenses spent:** **${fmtUSD(expTotal)}** (${mExpenses.length} ${mExpenses.length === 1 ? "item" : "items"})\n• **Net profit:** **${fmtUSD(netTotal)}**\n\n` +
        (mIncome.length ? `Top income: ${mIncome.map((i) => `${i.client} ${fmtUSD(i.amount)}`).join(" · ")}\n` : "") +
        (mExpenses.length ? `Top expenses: ${mExpenses.map((e) => `${e.category} ${fmtUSD(e.amount)}`).join(" · ")}` : "")
    );
  }

  // ─── 10. Affordability & Liquidity ("Can I afford a laptop for 2500?", "Do I have enough money?") ──
  if (
    /\b(?:can\s+(?:i|we)\s+afford|afford(?:ability)?|do\s+(?:i|we)\s+have\s+enough\s+(?:money|cash|funds)|is\s+there\s+enough\s+(?:money|cash|funds)|should\s+(?:i|we)\s+buy|can\s+(?:i|we)\s+buy|can\s+(?:i|we)\s+spend|enough\s+money\s+for|enough\s+cash\s+for|am\s+i\s+liquid|how\s+is\s+my\s+liquidity|liquidity|runway|burn\s+rate|working\s+capital)\b/i.test(
      q
    )
  ) {
    const liquidCash = bs.assets[0].amount;
    const monthlyBurn = pnl.monthly.length > 0 ? pnl.totalExpenses / pnl.monthly.length : 0;
    const freeCashAfterTax = liquidCash - unpaidTaxes;
    const safeBuffer = Math.round(monthlyBurn);
    const spendableNow = Math.max(0, freeCashAfterTax - safeBuffer);

    const amountMatch = cleanNumQ.match(/(?:for|at|costing|worth|of|\$)\s*\$?(\d+(?:\.\d+)?)|(\d{3,}(?:\.\d+)?)/i);
    const rawAmt = amountMatch ? parseFloat(amountMatch[1] || amountMatch[2]) : NaN;
    const purchaseAmt = !isNaN(rawAmt) && rawAmt > 0 && rawAmt !== 2026 ? rawAmt : null;

    if (purchaseAmt !== null) {
      const remainingCash = liquidCash - purchaseAmt;
      const remainingAfterTax = freeCashAfterTax - purchaseAmt;
      const verdict =
        remainingAfterTax >= safeBuffer
          ? `✅ **Yes — you can comfortably afford ${fmtUSD(purchaseAmt)}, ${userName}.**`
          : remainingAfterTax >= 0
          ? `⚠️ **You can cover ${fmtUSD(purchaseAmt)}, but it will dip into your 1-month expense buffer.**`
          : remainingCash >= 0
          ? `🚨 **Tight — you have the cash (${fmtUSD(liquidCash)}), but ${fmtUSD(unpaidTaxes)} is earmarked for ZIMRA/NSSA.**`
          : `❌ **Not from current cash alone — ${fmtUSD(purchaseAmt)} exceeds your ${fmtUSD(liquidCash)} bank balance.**`;

      return finish(
        `${verdict}\n\n• **Current cash & bank:** ${fmtUSD(liquidCash)}\n• **Less unpaid statutory taxes:** −${fmtUSD(unpaidTaxes)} → Free cash **${fmtUSD(freeCashAfterTax)}**\n• **Less purchase (${fmtUSD(purchaseAmt)}):** leaves **${fmtUSD(remainingAfterTax)}**\n• **Recommended 1-month cost buffer:** ${fmtUSD(safeBuffer)}\n• **Uncollected receivables waiting:** ${fmtUSD(totalReceivables)} (collecting these adds extra headroom)`
      );
    }

    const runwayMonths = monthlyBurn > 0 ? (liquidCash / monthlyBurn).toFixed(1) : "∞";
    return finish(
      `💧 **Liquidity & Affordability Check**\n• **Cash & bank on hand:** **${fmtUSD(liquidCash)}**\n• **Free cash after unpaid taxes (${fmtUSD(unpaidTaxes)}):** **${fmtUSD(freeCashAfterTax)}**\n• **Average monthly operating burn:** ${fmtUSD(monthlyBurn)} (**~${runwayMonths} months** cash runway)\n• **Safe discretionary spend right now (keeping 1-month buffer):** **${fmtUSD(spendableNow)}**\n• **Plus open client receivables:** ${fmtUSD(totalReceivables)}\n\nTip: ask *"Can I afford a laptop for 2500?"* with any amount and I'll stress-test the purchase for you.`
    );
  }

  // ─── 11. Top Debtor / Clients Owing Money ("Which client owes me the most?") ──
  if (
    /\b(?:which\s+client\s+owes|who\s+owes\s+(?:me|us)(?:\s+the\s+most|\s+money)?|biggest\s+debtor|top\s+debtor|largest\s+debtor|clients?\s+(?:that|who)\s+owe|unpaid\s+clients?|who\s+hasn'?t\s+paid|who\s+is\s+overdue)\b/i.test(
      q
    )
  ) {
    const debtorMap = new Map<string, { owed: number; invoices: string[]; overdue: boolean }>();
    openInvoices.forEach((inv) => {
      const clientName = data.clients.find((c) => c.id === inv.clientId)?.name ?? inv.clientId;
      const owed = Math.max(0, invoiceTotals(inv).total - inv.paidAmount);
      if (owed <= 0) return;
      const cur = debtorMap.get(clientName) ?? { owed: 0, invoices: [], overdue: false };
      cur.owed = Math.round((cur.owed + owed) * 100) / 100;
      cur.invoices.push(`${inv.number} (${inv.status})`);
      if (inv.status === "overdue") cur.overdue = true;
      debtorMap.set(clientName, cur);
    });
    const ranked = [...debtorMap.entries()].sort((a, b) => b[1].owed - a[1].owed);
    if (ranked.length === 0) {
      return finish(`🎉 **Zero debtors right now, ${userName}!** Every issued invoice is paid in full.`);
    }
    const [topName, topInfo] = ranked[0];
    return finish(
      `🧾 **${topName}** owes you the most at **${fmtUSD(topInfo.owed)}** (${topInfo.invoices.join(", ")}).\n\n**All clients with open balances (${fmtUSD(totalReceivables)} total):**\n` +
        ranked
          .map(
            ([name, info], idx) =>
              `${idx + 1}. **${name}** — **${fmtUSD(info.owed)}** · ${info.invoices.join(", ")}${info.overdue ? " 🚨 OVERDUE" : ""}`
          )
          .join("\n") +
        `\n\nUse the 📱 WhatsApp reminder button on the *Invoices* page to nudge ${topName} directly.`
    );
  }

  // Top / biggest client by revenue or general client list
  if (
    /\b(?:biggest\s+client|top\s+client|best\s+client|largest\s+client|how\s+many\s+clients|list\s+(?:my\s+|our\s+)?clients|my\s+clients|who\s+are\s+my\s+clients)\b/i.test(
      q
    )
  ) {
    const revByClient = new Map<string, number>();
    data.income.forEach((inc) => {
      revByClient.set(inc.client, (revByClient.get(inc.client) ?? 0) + inc.amount);
    });
    const topRev = [...revByClient.entries()].sort((a, b) => b[1] - a[1]);
    return finish(
      `🤝 **Client Portfolio (${data.clients.length} registered clients)**\n` +
        (topRev.length
          ? `**Top revenue sources YTD:**\n` +
            topRev
              .slice(0, 5)
              .map(([c, amt], idx) => `${idx + 1}. **${c}** — ${fmtUSD(amt)}`)
              .join("\n")
          : "No client revenue recorded yet.") +
        `\n\n**Most owed right now:** ${openInvoices.length ? `${openInvoices.length} open invoices totaling **${fmtUSD(totalReceivables)}**` : "none (all paid ✓)"}.`
    );
  }

  // ─── 12. "How much do I owe?" (Payables, Debts & Statutory Liabilities) ────
  if (
    /\b(?:how\s+much\s+do\s+(?:i|we)\s+owe|what\s+do\s+(?:i|we)\s+owe|who\s+do\s+(?:i|we)\s+owe|do\s+(?:i|we)\s+owe\s+anything|my\s+debts?|our\s+debts?|my\s+payables|total\s+payables|bills\s+to\s+pay|what\s+bills\s+are\s+due)\b/i.test(
      q
    ) &&
    !hit("client", "debtor", "owes me", "owed to me")
  ) {
    const unpaid = data.taxes.filter((t) => t.paidAmount < t.amount);
    const byType = { VAT: 0, PAYE: 0, NSSA: 0 };
    unpaid.forEach((t) => {
      byType[t.type] += t.amount - t.paidAmount;
    });
    return finish(
      `🧾 **What You Owe (Payables & Liabilities Summary)**\n• **Total statutory taxes payable:** **${fmtUSD(unpaidTaxes)}**\n  – VAT (ZIMRA): ${fmtUSD(byType.VAT)}\n  – PAYE (ZIMRA): ${fmtUSD(byType.PAYE)}\n  – NSSA contributions: ${fmtUSD(byType.NSSA)}\n• **Total balance-sheet liabilities:** **${fmtUSD(bs.totalLiabilities)}**\n\n` +
        (unpaid.length
          ? `**Upcoming & due returns:**\n` +
            unpaid
              .map((u) => `• **${u.type} ${u.period}** — **${fmtUSD(u.amount - u.paidAmount)}** (due ${u.dueDate})`)
              .join("\n")
          : "All statutory returns are settled — you owe $0.00 ✓") +
        `\n\nYour cash in bank (**${fmtUSD(bs.assets[0].amount)}**) covers these obligations **${unpaidTaxes > 0 ? `${(bs.assets[0].amount / unpaidTaxes).toFixed(1)}×` : "completely"}**.`
    );
  }

  // ─── 13. Net Worth / Book Value / Solvency ─────────────────────────────────
  if (hit("net worth", "networth", "book value", "what am i worth", "company value", "company worth", "solvency")) {
    return finish(
      `💎 **Net Worth & Financial Position**\n• **Total Assets:** **${fmtUSD(bs.totalAssets)}** (${bs.assets.map((a) => `${a.label}: ${fmtUSD(a.amount)}`).join(" · ")})\n• **Total Liabilities:** **${fmtUSD(bs.totalLiabilities)}**\n• **Net Worth (Total Equity):** **${fmtUSD(bs.totalEquity)}**\n\nEquity comprises **${fmtUSD(eq.capital)}** capital introduced, **${fmtUSD(eq.profit)}** YTD net profit, **${fmtUSD(eq.adjustments)}** adjustments, and **${fmtUSD(eq.drawings)}** drawings.`
    );
  }

  // ─── 14. Core Financial Topics (P&L, Balance Sheet, Cash Flow, Equity, Tax, Invoices, Fraud, Expenses, Streams, Payroll, Banking, Tasks) ──
  if (
    hit(
      "profit",
      "p&l",
      "pnl",
      "income statement",
      "earnings",
      "performance",
      "how much did i make",
      "how much did i earn",
      "revenue",
      "turnover",
      "top line",
      "bottom line",
      "margin",
      "gross profit",
      "net income"
    )
  ) {
    const bestMonth = [...pnl.monthly].sort((a, b) => b.profit - a.profit)[0];
    return finish(
      `📊 **Profit & Loss summary (2026 YTD)**\n• Total income: **${fmtUSD(pnl.totalIncome)}**\n• Direct costs: ${fmtUSD(pnl.costOfSales)} → Gross profit **${fmtUSD(pnl.grossProfit)}** (${fmtPct(pct(pnl.grossProfit, pnl.totalIncome))})\n• Operating expenses: ${fmtUSD(pnl.totalExpenses)}\n• **Net profit: ${fmtUSD(pnl.netProfit)}** (net margin ${fmtPct(pct(pnl.netProfit, pnl.totalIncome))})\n\nIncome by stream:\n• Salary: ${fmtUSD(pnl.incomeByStream.salary)}\n• Forensic audit & advisory: ${fmtUSD(pnl.incomeByStream.forensic)}\n• Big data seminars: ${fmtUSD(pnl.incomeByStream.seminar)}\n\nYour strongest month was ${bestMonth?.month ?? "—"} at ${fmtUSD(bestMonth?.profit ?? 0)} profit.`
    );
  }

  if (hit("balance sheet", "financial position", "assets", "liabilities", "position")) {
    return finish(
      `🏛️ **Statement of Financial Position**\n• Total assets: **${fmtUSD(bs.totalAssets)}**\n• Total liabilities: **${fmtUSD(bs.totalLiabilities)}**\n• Total equity: **${fmtUSD(bs.totalEquity)}**\n\nAssets: ${bs.assets.map((a) => `${a.label} ${fmtUSD(a.amount)}`).join(" · ")}\n\n${
        bs.totalAssets === 0 && bs.totalLiabilities === 0 && bs.totalEquity === 0
          ? "Your books are clean, so every line sits at zero."
          : `Current ratio is healthy and the balance sheet ${bs.balanced ? "balances ✓" : "needs review ⚠️"}.`
      }`
    );
  }

  if (hit("bank account", "cbz", "steward", "reconcil", "unmatched")) {
    const unmatched = data.bankTxns.filter((t) => !t.matched);
    return finish(
      `🏦 **Banking & Reconciliation**\n` +
        data.bankAccounts
          .map((b) => {
            const mov = data.bankTxns.filter((t) => t.accountId === b.id).reduce((a, t) => a + t.amount, 0);
            return `• **${b.bank} — ${b.name} (${b.accountNumber}):** opening ${fmtUSD(b.openingBalance)} → current **${fmtUSD(b.openingBalance + mov)}**`;
          })
          .join("\n") +
        `\n• **Combined closing cash:** **${fmtUSD(cf.closing)}**\n• **Unmatched bank items:** **${unmatched.length}**${
          unmatched.length
            ? ` (${unmatched.map((u) => `${u.date} ${u.description} ${fmtUSD(u.amount)}`).join(" · ")})`
            : " — fully reconciled ✓"
        }`
    );
  }

  if (hit("cash flow", "cashflow", "cash position", "bank balance", "cash", "money in bank", "how much money do i have")) {
    return finish(
      `💵 **Cash flow summary**\n• Opening bank balance: ${fmtUSD(cf.opening)}\n• Net movement: **${fmtUSD(cf.net)}**\n• Closing position: **${fmtUSD(cf.closing)}**\n• Operating: ${fmtUSD(cf.operating)} · Investing: ${fmtUSD(cf.investing)} · Financing: ${fmtUSD(cf.financing)}\n\nWatch item: keep a buffer of at least ${fmtUSD(pnl.totalExpenses / 10)} for monthly fixed costs.`
    );
  }

  if (hit("equity", "capital", "drawings", "changes in equity", "owner's equity", "retained earnings")) {
    return finish(
      `📈 **Changes in Equity**\n• Opening: ${fmtUSD(eq.opening)}\n• Capital introduced: +${fmtUSD(eq.capital)}\n• Profit for the period: +${fmtUSD(eq.profit)}\n• Adjustments: +${fmtUSD(eq.adjustments)}\n• Drawings: ${fmtUSD(eq.drawings)}\n• **Closing equity: ${fmtUSD(eq.closing)}**`
    );
  }

  if (hit("payroll", "payslip", "employees", "staff", "team", "wages", "who works")) {
    const grossTotal = data.payroll.reduce((a, p) => a + p.gross + p.allowances, 0);
    const netTotal = data.payroll.reduce((a, p) => a + p.net, 0);
    return finish(
      `👥 **Payroll Register (${data.payroll.length} staff members)**\n• Monthly gross + allowances: **${fmtUSD(grossTotal)}** → Net pay **${fmtUSD(netTotal)}**\n` +
        data.payroll
          .map((p) => `• **${p.name}** (${p.position}, ${p.department}) — Gross ${fmtUSD(p.gross + p.allowances)} · Net ${fmtUSD(p.net)}`)
          .join("\n")
    );
  }

  if (hit("vat", "zimra", "tax", "paye", "nssa", "payable", "statutory", "aids levy")) {
    const unpaid = data.taxes.filter((t) => t.paidAmount < t.amount);
    const totalDue = unpaid.reduce((a, b) => a + (b.amount - b.paidAmount), 0);
    const vat = data.taxes.filter((t) => t.type === "VAT");
    return finish(
      `🧾 **Statutory payables**\n• Outstanding across VAT/NSSA/PAYE: **${fmtUSD(totalDue)}**\n\nVAT (standard rate ${data.settings.vatRate}%): ${vat
        .map((v) => `${v.period} ${fmtUSD(v.amount - v.paidAmount)}${v.paidAmount < v.amount ? " due" : " paid ✓"}`)
        .join(" · ")}\nNSSA: employee ${data.settings.nssaEmployeeRate}% / employer ${data.settings.nssaEmployerRate}% on insurable earnings up to ${fmtUSD(
        data.settings.nssaCeiling
      )}.\nPAYE: monthly USD bands, remitted by the 15th following month.\n\n${
        unpaid.length
          ? `Next deadlines: ${unpaid
              .slice(0, 3)
              .map((u) => `${u.type} ${u.period} due ${u.dueDate}`)
              .join(" · ")}`
          : "All statutory returns are up to date ✓"
      }`
    );
  }

  if (hit("invoice", "receivable", "owed", "overdue", "debtors", "aging", "unpaid", "bill client", "quote")) {
    const aging = receivablesAging(data);
    return finish(
      `🧾 **Receivables & Invoices**\n• Open invoices: **${openInvoices.length}** (total outstanding **${fmtUSD(totalReceivables)}**)\n• Aging: ${aging
        .map((a) => `${a.name} ${fmtUSD(a.amount)}`)
        .join(" · ")}\n\n${openInvoices
        .slice(0, 5)
        .map(
          (i) =>
            `• **${i.number}** — ${data.clients.find((c) => c.id === i.clientId)?.name ?? "?"} — **${fmtUSD(
              invoiceTotals(i).total - i.paidAmount
            )}** (${i.status})`
        )
        .join("\n")}\n\nTip: I can remind clients via WhatsApp — try the 📱 button on any invoice.`
    );
  }

  if (
    hit(
      "fraud",
      "anomaly",
      "anomalies",
      "flag",
      "red flag",
      "suspicious",
      "risk alert",
      "unusual",
      "irregular",
      "outlier",
      "strange",
      "ml model",
      "isolation forest"
    )
  ) {
    const flags = data.fraudFlags;
    const high = flags.filter((f) => f.severity === "high" && f.status === "open");
    return finish(
      `🚨 **Fraud & anomaly monitor**\n• Flags raised: **${flags.length}** (${high.length} high-risk open)\n\n${
        flags
          .slice(0, 4)
          .map((f) => `• [${f.severity.toUpperCase()} · score ${f.score}] ${f.description} — ${fmtUSD(f.amount)} (${f.reason})`)
          .join("\n") || "No anomalies detected — your transaction patterns look clean."
      }\n\nThe model re-scores all ledgers whenever data changes (MHF-IF v2.1).`
    );
  }

  if (hit("expense", "cost", "spending", "spend", "overhead", "outflow", "bills")) {
    const top = pnl.expensesByCategory.slice(0, 4);
    return finish(
      `💸 **Expense analysis**\n• Total spend YTD: **${fmtUSD(pnl.totalExpenses)}**\n• Top categories: ${top
        .map((e) => `${e.category} ${fmtUSD(e.amount)}`)
        .join(" · ")}\n• Expense ratio: ${fmtPct(pct(pnl.totalExpenses, pnl.totalIncome))} of income\n\n${
        top[0] ? `${top[0].category} is your largest cost driver — worth a variance review.` : ""
      }`
    );
  }

  if (hit("ledger", "journal", "trial balance", "chart of accounts", "double entry", "accounting")) {
    const balances = accountBalances(data);
    const totalDebits = balances.reduce((a, b) => a + b.debit, 0);
    const totalCredits = balances.reduce((a, b) => a + b.credit, 0);
    return finish(
      `📒 **General Ledger & Trial Balance**\n• Journal entries posted: **${data.journal.length}** across **${balances.length}** accounts\n• Total Debits: **${fmtUSD(totalDebits)}** · Total Credits: **${fmtUSD(totalCredits)}** (${Math.abs(totalDebits - totalCredits) < 1 ? "Trial balance in balance ✓" : "Out of balance ⚠️"})\n• Open *Accounting* in the sidebar to post manual journals or inspect account balances.`
    );
  }

  if (hit("task", "to do", "todo", "deadline", "action item", "priority", "priorities", "focus on", "what should i do")) {
    const openTasks = data.tasks.filter((t) => t.status !== "done");
    const highTasks = openTasks.filter((t) => t.priority === "high");
    return finish(
      `✅ **Action Items & Priorities (${openTasks.length} open tasks, ${highTasks.length} high-priority)**\n` +
        highTasks
          .slice(0, 5)
          .map((t) => `• **[${t.department}]** ${t.title} — ${t.assignee} (due ${t.due})`)
          .join("\n") +
        `\n\n**Financial priorities right now:**\n1. Collect **${fmtUSD(totalReceivables)}** across ${openInvoices.length} open invoices.\n2. Settle **${fmtUSD(unpaidTaxes)}** in upcoming statutory returns.\n3. Review **${openFraud.length}** open fraud/reconciliation alerts.`
    );
  }

  if (hit("department", "marketing", "hr", "procurement", "security", "cash office", "it ")) {
    return finish(
      `🏢 **Departments live in this suite**: ${["Marketing", "IT", "HR", "Accounts", "Procurement", "Cash Office", "Security"].join(
        ", "
      )}.\nOpen *Departments* in the sidebar for KPIs, task boards and workload per unit. HR owns payroll & NSSA, Accounts owns VAT/PAYE filings, Cash Office handles lodgements & reconciliation, Security runs access & compliance reviews.`
    );
  }

  if (hit("salary", "seminar", "forensic", "income stream", "stream", "revenue mix")) {
    const mix = Object.entries(pnl.incomeByStream) as [string, number][];
    return finish(
      `💼 **Revenue by stream (YTD ${fmtUSD(pnl.totalIncome)})**\n${mix
        .map(
          ([k, v]) =>
            `• ${k === "salary" ? "Salary & employment" : k === "forensic" ? "Forensic audit & advisory" : "Big data seminars"}: ${fmtUSD(
              v
            )} (${fmtPct(pct(v, pnl.totalIncome))})`
        )
        .join("\n")}\n\nForensic advisory is your largest earner at ${fmtPct(pct(pnl.incomeByStream.forensic, pnl.totalIncome))} of revenue.`
    );
  }

  if (hit("remind", "whatsapp", "send", "notify")) {
    return finish(
      `📱 I can send WhatsApp notifications to **${data.settings.whatsappNumber}** (Settings → WhatsApp). Use the 📱 buttons on invoices and reports to push payment reminders and summary digests instantly. For automated alerts, connect Twilio/WhatsApp Business API in Settings — the endpoint /api/whatsapp is ready.`
    );
  }

  if (hit("voice", "call", "phone", "mic", "dictat", "audio", "whisper", "transcribe", "speak", "talk to you")) {
    return finish(
      `🎙️ **Sophie Voice & Audio Suite**\n• **Mic dictation:** click the 🎤 button in the composer to dictate live.\n• **Audio notes:** upload any recording via 📎 to transcribe through \`/api/transcribe\` (Whisper).\n• **Call Sophie:** start a hands-free browser voice conversation at the top of this page.\n• **Sophie, call me:** triggers a simulated incoming call with ringtone, live captions & speaker controls.\n• **Real phone calls:** point your Twilio number webhook at \`/api/sophie/voice\`.`
    );
  }

  if (hit("export", "csv", "pdf", "report", "download", "import", "backup")) {
    return finish(
      `📤 **Import / Export**\n• *Reports* page: export any dataset (income, expenses, invoices, ledger, taxes, payroll) to **CSV** or a branded **PDF** report with your logo.\n• Import bank statements & transactions via CSV (column mapper included).\n• Invoice PDFs are print-ready for clients.`
    );
  }

  if (
    hit(
      "advice",
      "recommend",
      "increase profit",
      "grow",
      "reduce cost",
      "cut cost",
      "save money",
      "forecast",
      "projection",
      "next month",
      "budget",
      "strategy"
    )
  ) {
    const avgMonthlyIncome = pnl.monthly.length ? pnl.totalIncome / pnl.monthly.length : 0;
    const avgMonthlyExpense = pnl.monthly.length ? pnl.totalExpenses / pnl.monthly.length : 0;
    return finish(
      `🧭 **Forensic & Financial Advisory for ${userName}**\n• **Run-rate projection:** averaging **${fmtUSD(avgMonthlyIncome)}/mo** revenue vs **${fmtUSD(avgMonthlyExpense)}/mo** spend → projected next-month net profit of **${fmtUSD(avgMonthlyIncome - avgMonthlyExpense)}**.\n• **Quickest cash win:** convert **${fmtUSD(totalReceivables)}** of unpaid forensic & seminar invoices into bank cash.\n• **Margin lever:** Forensic Audit & Advisory delivers **${fmtPct(pct(pnl.incomeByStream.forensic, pnl.totalIncome))}** of revenue with minimal direct costs — pricing one additional engagement per quarter adds ~${fmtUSD(6500)} straight to gross profit.`
    );
  }

  if (
    hit(
      "month",
      "monthly report",
      "summary",
      "overview",
      "dashboard",
      "how am i doing",
      "how are we doing",
      "how is business",
      "how's business",
      "status",
      "snapshot",
      "briefing",
      "numbers",
      "books",
      "finances",
      "financials"
    )
  ) {
    return finish(
      `🗺️ **Executive snapshot — October 2026**\n• Revenue YTD: **${fmtUSD(pnl.totalIncome)}** · Net profit **${fmtUSD(pnl.netProfit)}**\n• Cash & equivalents: **${fmtUSD(bs.assets[0].amount)}**\n• Receivables outstanding: ${fmtUSD(bs.assets[1].amount)}\n• Statutory payables open: ${fmtUSD(unpaidTaxes)}\n• Fraud flags open: ${openFraud.length}\n\n${
        hasBooks
          ? "You're tracking well — protect margin by billing open engagements this week."
          : "Add your first client, invoice or expense and I'll turn these numbers into insight."
      }`
    );
  }

  // Specific client name lookup if the user mentions one of their clients
  const matchedClient = data.clients.find((c) => q.includes(c.name.toLowerCase()));
  if (matchedClient) {
    const cInvoices = data.invoices.filter((i) => i.clientId === matchedClient.id);
    const cOwed = cInvoices
      .filter((i) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((a, i) => a + Math.max(0, invoiceTotals(i).total - i.paidAmount), 0);
    const cIncome = data.income.filter((i) => i.client.toLowerCase() === matchedClient.name.toLowerCase()).reduce((a, i) => a + i.amount, 0);
    return finish(
      `🏢 **Client file: ${matchedClient.name}**\n• **Stream:** ${matchedClient.stream} · **Contact:** ${matchedClient.email} (${matchedClient.phone})\n• **Revenue YTD:** **${fmtUSD(cIncome)}**\n• **Open balance owed:** **${fmtUSD(cOwed)}** across ${cInvoices.length} ${cInvoices.length === 1 ? "invoice" : "invoices"}`
    );
  }

  // Conversational catch-all for polite questions so everyday phrases get a helpful grounded response
  if (/\b(?:can\s+you|could\s+you|please|i\s+need|i\s+want|show\s+me|tell\s+me|check|look\s+at|review)\b/i.test(q)) {
    return finish(
      `Here's a quick check on your books right now, **${userName}**:\n• **Revenue YTD:** ${fmtUSD(pnl.totalIncome)} · **Net profit:** ${fmtUSD(pnl.netProfit)} (${fmtPct(pct(pnl.netProfit, pnl.totalIncome))} margin)\n• **Cash & bank:** ${fmtUSD(bs.assets[0].amount)} · **Receivables:** ${fmtUSD(totalReceivables)}\n• **Statutory taxes due:** ${fmtUSD(unpaidTaxes)} · **Fraud flags:** ${openFraud.length} open\n\nAsk me about any specific month, client, invoice, tax return, or calculation and I'll drill right in!`
    );
  }

  return finish(
    `I'm still learning 🤓 — try asking me about:\n• "What did I earn last month?" or "What did I spend in September?"\n• "Which client owes me the most?"\n• "How much do I owe?" or "Can I afford a laptop for 2500?"\n• "PAYE on 2500" or "what is 1200 + 3400?"\n• "Remember that I bank with CBZ" or "What do you remember?"\n\nOr type **help** to see everything I can do.`,
    "fallback"
  );
}

export function sophieReply(question: string, data: AppData): string {
  return sophieTurn(question, data).reply;
}
