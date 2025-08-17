import { NextResponse } from 'next/server';

type Body = {
  fieldId: string;
  text: string;
};

async function validateWithGoogle(text: string) {
  const key = process.env.GOOGLE_FLASH_API_KEY;
  if (!key) return null;
  try {
    const prompt = `You are a strict validator. Given an answer from a CRM survey, decide if it is specific, relevant, and useful. Reply ONLY in JSON: {"ok": boolean, "reasons": string[]}.
Answer: ${text}`;
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      },
    );
    const data = await res.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    if (!textOut) return null;
    const match = textOut.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function validateWithOpenRouter(text: string) {
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
              'You are a strict validator. Reply ONLY valid JSON: {"ok": boolean, "reasons": string[]}.',
          },
          { role: 'user', content: `Is this answer specific, relevant, and useful?\nAnswer: ${text}` },
        ],
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content as string | undefined;
    if (!out) return null;
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { fieldId, text } = (await req.json()) as Body;
  let result = await validateWithGoogle(text);
  if (!result) result = await validateWithOpenRouter(text);
  if (!result) {
    // Heuristic: block only empty/gibberish; otherwise advisory
    const trimmed = (text || '').trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const looksGibberish = /^(?:[a-z]{1,2}\s*){1,6}$/i.test(trimmed);
    const ok = !(trimmed.length === 0 || looksGibberish);
    const reasons: string[] = ok ? [] : ['This seems too brief to act on. Add a couple of details (what/where/impact).'];
    result = { ok, reasons };
  }
  return NextResponse.json({ fieldId, ok: !!result.ok, reasons: result.reasons || [] });
}


