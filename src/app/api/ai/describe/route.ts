import { NextResponse } from 'next/server';

type Body = {
  questionId: string;
  options: { id: string; label: string }[];
};

async function describeWithGoogle(questionId: string, options: { id: string; label: string }[]) {
  const key = process.env.GOOGLE_FLASH_API_KEY;
  if (!key) return null;
  const list = options.map(o => `- ${o.label}`).join('\n');
  const prompt = `Provide a one-line plain-English explanation for each item below as it relates to CRM pain points. Reply ONLY JSON object mapping label->explanation. Keep explanations under 12 words each.\nQuestion ID: ${questionId}\nItems:\n${list}`;
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
    const match = textOut?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Record<string, string>;
  } catch {
    return null;
  }
}

async function describeWithOpenRouter(questionId: string, options: { id: string; label: string }[]) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const list = options.map(o => `- ${o.label}`).join('\n');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Reply ONLY with a JSON object mapping label->short explanation (<12 words).' },
          { role: 'user', content: `Question ID: ${questionId}\nItems:\n${list}` },
        ],
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content as string | undefined;
    const match = out?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { questionId, options } = (await req.json()) as Body;
  let llmMap = await describeWithGoogle(questionId, options);
  if (!llmMap) llmMap = await describeWithOpenRouter(questionId, options);
  const leftover = llmMap ? Object.values(llmMap) : [];
  const out: Record<string, string> = {};
  options.forEach((opt, idx) => {
    const key = opt.label;
    const direct = llmMap?.[key] || llmMap?.[key.toLowerCase()];
    const val = (typeof direct === 'string' && direct.trim()) || (typeof leftover[idx] === 'string' ? String(leftover[idx]) : '');
    out[key] = val as string;
  });
  return NextResponse.json({ descriptions: out });
}


