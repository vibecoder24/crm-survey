import { NextResponse } from 'next/server';

type Body = {
  fieldId: string;
  text: string;
  question?: string;
  roleId?: string;
};

type ValidationResult = {
  ok: boolean;
  friendly?: string;
  wantsSkip?: boolean;
  wantsMore?: boolean;
  reasons?: string[];
};

async function validateWithGoogle(text: string, question?: string, roleId?: string) {
  const key = process.env.GOOGLE_FLASH_API_KEY;
  if (!key) return null;
  try {
    const prompt = `You are a kind survey coach. Given a user's short answer, decide if it is specific, relevant, and useful. Respond ONLY valid JSON with keys: {"ok": boolean, "friendly": string, "wantsSkip": boolean, "wantsMore": boolean}.
Rules:
- ok = false ONLY if empty or obvious gibberish; otherwise true even if brief.
- friendly MUST be one short sentence that starts with "Thank you." Keep an appreciative, coaching tone. Provide a concrete suggestion that helps the user add one useful detail. Do NOT output labels like "Not specific" or "Not useful"; avoid scolding or bullet lists.
- If the answer indicates they do not use a CRM (e.g., "I don't use CRM") for a CRM-specific question, suggest describing their start-of-day routine in whatever they DO use (e.g., Excel/Sheets, email). Example coaching: "Thank you. If you mostly use Sheets or email instead of a CRM, you can describe what you open first and what you scan each morning (e.g., a spreadsheet of new leads, yesterday’s replies)." In this case, set wantsSkip=true so they can move on if they prefer, and mention that they can type "skip" to proceed.
- wantsSkip = true if the user indicates intent to skip or says things like "na", "n/a", "none", "nothing", "no comment", "not applicable", "don’t know". When wantsSkip=true, ensure the friendly text clearly tells the user they can type "skip" to move on.
- wantsMore = true if the answer is likely insufficient for this question (e.g., for a metrics list, only one vague item).
- If the question does not explicitly ask for numbers, do NOT suggest providing numeric counts. Prefer asking for one concrete example, a next action, or where they look.
Question: ${question || ''}
Role (optional): ${roleId || ''}
Answer: ${text}`;
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
        }),
      },
    );
    const data = await res.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    if (!textOut) return null;
    const match = textOut.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as ValidationResult;
  } catch {
    return null;
  }
}

async function validateWithOpenRouter(text: string, question?: string, roleId?: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a kind survey coach. Reply ONLY valid JSON with keys: {"ok": boolean, "friendly": string, "wantsSkip": boolean, "wantsMore": boolean}.\n- ok=false only if empty or gibberish.\n- friendly must start with "Thank you." and be one short, gentle sentence with a concrete suggestion. Do not output labels like "Not specific" or "Not useful"; no scolding or bullets.\n- If the answer implies they do not use a CRM for a CRM question, suggest describing their routine in what they do use (e.g., Excel/Sheets, email), and set wantsSkip=true while mentioning they can type "skip" to move on.\n- Do NOT ask for numeric values unless the original question explicitly asked for numbers.\n- Set wantsMore=true if the answer is likely insufficient (e.g., list needs one more item).',
          },
          { role: 'user', content: `Question: ${question || ''}\nRole: ${roleId || ''}\nAnswer: ${text}` },
        ],
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content as string | undefined;
    if (!out) return null;
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as ValidationResult;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { fieldId, text, question, roleId } = (await req.json()) as Body;

  let result: ValidationResult | null = await validateWithGoogle(text, question, roleId);
  if (!result) result = await validateWithOpenRouter(text, question, roleId);

  if (!result) {
    // Minimal fallback: detect clear skip synonyms and a common "don’t use CRM" pattern
    const trimmed = (text || '').trim();
    const skipSyn = /^(?:na|n\/a|none|nothing|no\s*comment|not\s*applicable|don'?t\s*know)$/i.test(trimmed);
    const noCrm = /\b(?:don'?t|do not)\s+use\s+crm\b/i.test(trimmed) || /\bno\s+crm\b/i.test(trimmed);
    const friendly = noCrm
      ? 'Thank you. If you mostly use spreadsheets or email instead of a CRM, you can describe what you open first and what you scan each morning (e.g., an Excel list of new leads, yesterday’s replies). You can also type "skip" to move on.'
      : undefined;
    result = { ok: true, friendly, wantsSkip: skipSyn || noCrm, wantsMore: !!noCrm };
  }

  return NextResponse.json({ fieldId, ok: !!result.ok, friendly: result.friendly, wantsSkip: !!result.wantsSkip, wantsMore: !!result.wantsMore });
}


