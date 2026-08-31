import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { assertSameOrigin, errorResponse, requireToken, rpc } from "@/lib/server/api";

export const maxDuration = 60;

type AiMode = "minutes" | "summary" | "brainstorm";

interface AiRequest {
  mode?: AiMode;
  meetingTitle?: string;
  transcript?: string;
  topic?: string;
  locale?: string;
}

const SYSTEM_PROMPTS: Record<AiMode, string> = {
  minutes:
    "You are Asameet's meeting assistant. Write formal, well-structured meeting minutes (صورت‌جلسه) from the provided meeting transcript/notes. Include: title, date, attendees (if inferable), agenda items discussed, decisions made, and action items with owners. Respond in the same language as the transcript (Persian if Persian). Use clean markdown with headings and bullet lists.",
  summary:
    "You are Asameet's meeting assistant. Write a concise executive summary of the provided meeting transcript/notes: 3-5 key points, decisions, and next steps. Respond in the same language as the input (Persian if Persian). Use clean markdown.",
  brainstorm:
    "You are Asameet's brainstorming partner. For the given topic, propose creative, practical ideas: at least 6 distinct ideas grouped by theme, each with a one-line rationale, then suggest the 2 most promising ones. Respond in the same language as the topic (Persian if Persian). Use clean markdown.",
};

/** Deterministic demo output for deployments without an API key. */
function demoOutput(mode: AiMode, title: string, input: string, locale: string): string {
  const faDemo: Record<AiMode, string> = {
    minutes: `# صورت‌جلسه: ${title}\n\n**تاریخ:** ${new Date().toLocaleDateString("fa-IR")}\n\n## دستور جلسه\n- مرور پیشرفت نسخه ۱.۰ آسامیت\n- برنامه‌ریزی انتشار عمومی و دموی محصول\n\n## خلاصه مذاکرات\n- اعضای تیم وضعیت بخش‌های پیام‌رسان، جلسات و پنل مدیریت را ارائه کردند.\n- طراحی گلاسمورفیسم و لوگوی جدید به تأیید نهایی رسید.\n\n## تصمیمات\n۱. انتشار نسخه عمومی طبق زمان‌بندی انجام شود.\n۲. بازخورد کاربران در گروه «تیم محصول» جمع‌آوری شود.\n\n## اقدامات\n- [ ] آماده‌سازی محیط دمو — مسئول: تیم زیرساخت\n- [ ] تهیه ویدیوی معرفی — مسئول: تیم محصول\n\n---\n*این خروجی نمونهٔ حالت دمو است؛ با تنظیم کلید API، صورت‌جلسه واقعی از محتوای جلسه تولید می‌شود.*`,
    summary: `# خلاصه جلسه: ${title}\n\n- پیشرفت نسخه ۱.۰ مرور شد و همه بخش‌ها آماده انتشار هستند.\n- طراحی نهایی (گلاسمورفیسم + لوگو) تأیید شد.\n- جمع‌بندی: انتشار طبق برنامه؛ تمرکز بعدی روی بازخورد کاربران.\n\n**گام‌های بعدی:** آماده‌سازی دمو و ویدیوی معرفی.\n\n---\n*خروجی نمونهٔ حالت دمو — برای خلاصه واقعی، کلید API را تنظیم کنید.*`,
    brainstorm: `# هم‌فکری: ${input || title}\n\n## ایده‌های ارتباطی\n۱. **اتاق‌های موضوعی زنده** — گفت‌وگوهای صوتی باز مثل رادیو تیمی.\n۲. **واکنش‌های هوشمند** — پیشنهاد واکنش بر اساس محتوای پیام.\n\n## ایده‌های هوش مصنوعی\n۳. **ترجمه همزمان جلسات** — هر شرکت‌کننده به زبان خودش بشنود.\n۴. **کارت اقدام خودکار** — تبدیل جمله «باید انجام بدیم» به تسک.\n\n## ایده‌های آموزشی\n۵. **آزمون سریع در کلاس** — سوال چهارگزینه‌ای حین تدریس.\n۶. **گزارش پیشرفت هفتگی** — خلاصه خودکار برای والدین/مدیران.\n\n**پیشنهاد برتر:** ایده‌های ۳ و ۴ بیشترین ارزش فوری را دارند.\n\n---\n*خروجی نمونهٔ حالت دمو — برای هم‌فکری واقعی، کلید API را تنظیم کنید.*`,
  };
  const enDemo: Record<AiMode, string> = {
    minutes: `# Meeting Minutes: ${title}\n\n**Date:** ${new Date().toLocaleDateString("en-US")}\n\n## Agenda\n- Asameet v1.0 progress review\n- Public launch & demo planning\n\n## Discussion\n- Team presented status of messenger, meetings and admin panel.\n- Glassmorphism design and the new logo received final approval.\n\n## Decisions\n1. Ship the public release on schedule.\n2. Collect user feedback in the "Product Team" group.\n\n## Action items\n- [ ] Prepare the demo environment — owner: infra team\n- [ ] Produce the intro video — owner: product team\n\n---\n*Demo-mode sample output; configure an API key for real minutes generated from your meeting content.*`,
    summary: `# Summary: ${title}\n\n- v1.0 progress reviewed; all modules ready for release.\n- Final design (glassmorphism + logo) approved.\n- Conclusion: release on schedule; next focus is user feedback.\n\n**Next steps:** prepare the demo and the intro video.\n\n---\n*Demo-mode sample output — configure an API key for real summaries.*`,
    brainstorm: `# Brainstorm: ${input || title}\n\n## Communication ideas\n1. **Live topic rooms** — open audio spaces like a team radio.\n2. **Smart reactions** — reaction suggestions based on message content.\n\n## AI ideas\n3. **Real-time meeting translation** — everyone hears their own language.\n4. **Auto action cards** — turn "we should do X" into a task.\n\n## Education ideas\n5. **In-class quick quiz** — multiple-choice questions while teaching.\n6. **Weekly progress digest** — automatic summary for parents/managers.\n\n**Top picks:** ideas 3 and 4 deliver the most immediate value.\n\n---\n*Demo-mode sample output — configure an API key for real brainstorming.*`,
  };
  return (locale === "fa" || locale === "ar" ? faDemo : enDemo)[mode];
}

/** Env names close enough to ANTHROPIC_API_KEY to be a misconfiguration. */
const KEYISH = /^(next_public_)?(anthropic|antropic|anthopic|claude)[._-]?(api)?[._-]?(key|token|secret)$/i;

/**
 * Describe a candidate key by shape only. Never returns any part of a value:
 * a length and a few booleans are enough to tell "that is the key under the
 * wrong name" from "that is something else entirely".
 */
function describe(name: string, value: string) {
  return {
    name,
    length: value.length,
    looksAnthropic: /^sk-ant-/.test(value.trim()),
    hasSurroundingQuotes: /^["'].*["']$/s.test(value),
    hasWhitespace: value !== value.trim(),
  };
}

/**
 * Health probe. Whether the assistant is live comes down to one env var, and
 * the alternative was to POST a transcript and read the `demo` flag off the
 * reply — which costs a model call. A GET answers it for free.
 *
 * When the key is missing it also reports which near-miss names are set, so a
 * typo is visible without anyone reading the deployment's env. The key itself
 * is never returned, and the diagnostics disappear once it is configured, so
 * a healthy deployment discloses nothing.
 */
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const configured = Boolean(key);

  const body: Record<string, unknown> = {
    configured,
    mode: configured ? "live" : "demo",
    model: process.env.ASAMEET_AI_MODEL || "claude-opus-5",
    modes: Object.keys(SYSTEM_PROMPTS),
  };

  if (!configured) {
    const nearMisses = Object.entries(process.env)
      .filter(([n, v]) => Boolean(v) && n !== "ANTHROPIC_API_KEY" && KEYISH.test(n))
      .map(([n, v]) => describe(n, v as string));

    body.diagnostics = {
      expected: "ANTHROPIC_API_KEY",
      set: false,
      // An empty string reads as unset to the app, and is worth calling out.
      definedButEmpty: "ANTHROPIC_API_KEY" in process.env,
      nearMisses,
      hint:
        nearMisses.length > 0
          ? `Found ${nearMisses.map((m) => m.name).join(", ")}. Rename to ANTHROPIC_API_KEY (Production), then redeploy.`
          : "No similar name is set on this deployment. Check the variable is on the 'asameet' project, ticked for Production, and that you redeployed after saving.",
    };
  }

  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  // The assistant spends real model tokens — only signed-in members may use it.
  try {
    assertSameOrigin(req);
    const token = await requireToken();
    await rpc("api_ping", { p_token: token });
  } catch (e) {
    return errorResponse(e);
  }

  const body = (await req.json().catch(() => null)) as AiRequest | null;
  const mode = body?.mode;
  if (!mode || !(mode in SYSTEM_PROMPTS)) {
    return NextResponse.json({ error: "mode must be minutes | summary | brainstorm" }, { status: 400 });
  }
  const title = body?.meetingTitle?.trim() || "جلسه آسامیت";
  const input = (mode === "brainstorm" ? body?.topic : body?.transcript)?.trim() ?? "";
  const locale = body?.locale ?? "fa";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ result: demoOutput(mode, title, input, locale), demo: true });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ASAMEET_AI_MODEL || "claude-opus-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPTS[mode],
      messages: [
        {
          role: "user",
          content:
            mode === "brainstorm"
              ? `Topic: ${input || title}`
              : `Meeting title: ${title}\n\nTranscript / notes:\n${input || "(no transcript captured — write a reasonable template based on the title)"}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "declined" }, { status: 422 });
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ result: text, demo: false });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `ai upstream error (${err.status})` }, { status: 502 });
    }
    return NextResponse.json({ error: "ai request failed" }, { status: 500 });
  }
}
