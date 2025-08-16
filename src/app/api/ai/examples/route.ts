import { NextResponse } from 'next/server';

type Body = {
  questionId: string;
  roleId?: string;
};

async function examplesWithGoogle(questionId: string, roleId?: string) {
  const key = process.env.GOOGLE_FLASH_API_KEY;
  if (!key) return null;
  const roleText = roleId ? `Role: ${roleId}` : 'Role: unknown';
  const prompt = `Give 6 short examples (2–4 words each) of DAILY OPERATIONAL METRICS a user checks.
Return ONLY a JSON array of strings. No prose, no numbering, no sentences, no verbs like "increase".
Prefer neutral metric labels such as 'daily leads created', 'meetings booked', 'open pipeline', 'emails sent'.
${roleText}
Question ID: ${questionId}`;
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      },
    );
    const data = await res.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    const match = textOut?.match(/\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]) as string[];
  } catch {
    return null;
  }
}

async function examplesWithOpenRouter(questionId: string, roleId?: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Reply ONLY a JSON array of 6 short example answers.' },
          { role: 'user', content: `Question ID: ${questionId}\nRole: ${roleId || 'unknown'}` },
        ],
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content as string | undefined;
    const match = out?.match(/\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]) as string[];
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { questionId, roleId } = (await req.json()) as Body;
  let examples = await examplesWithGoogle(questionId, roleId);
  if (!examples) examples = await examplesWithOpenRouter(questionId, roleId);
  if (!examples) examples = ['Pipeline value', 'Open deals', 'Tasks due', 'Stage conversions', 'Activities today', 'Forecast'];
  return NextResponse.json({ examples });
}


