import { NextResponse } from 'next/server';

type Body = {
  question: string;
  answer: string;
};

async function followupWithGoogle(question: string, answer: string) {
  const key = process.env.GOOGLE_FLASH_API_KEY;
  if (!key) return null;
  try {
    const prompt = `You are a helpful research assistant. Given a survey question and a short or vague answer, suggest ONE short follow-up question (max 18 words) that would make the answer more specific and useful. Reply ONLY the question text.
Question: ${question}
Answer: ${answer}`;
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
    return textOut?.trim() || null;
  } catch {
    return null;
  }
}

async function followupWithOpenRouter(question: string, answer: string) {
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
          { role: 'system', content: 'Suggest ONE short follow-up question (<=18 words) to improve the user\'s answer. Reply only the question.' },
          { role: 'user', content: `Question: ${question}\nAnswer: ${answer}` },
        ],
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content as string | undefined;
    return out?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { question, answer } = (await req.json()) as Body;
  let followup = await followupWithGoogle(question, answer);
  if (!followup) followup = await followupWithOpenRouter(question, answer);
  if (!followup) followup = 'Could you share a concrete example or numbers to make this clearer?';
  return NextResponse.json({ followup });
}


