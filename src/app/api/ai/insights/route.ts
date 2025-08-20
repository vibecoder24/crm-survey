import { NextResponse } from 'next/server';
import { pool, ensureSchema } from '@/lib/db';

export async function GET() {
  await ensureSchema();
  const { rows } = await pool.query('select answers, ratings from survey_responses order by created_at desc limit 500');
  const payload = rows.map(r => ({ answers: r.answers, ratings: r.ratings }));

  const key = process.env.OPENROUTER_API_KEY || process.env.GOOGLE_FLASH_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: 'Missing LLM key' }, { status: 500 });

  const prompt = `You are a product strategist analyzing CRM survey data. Summarize top pain points, repeated themes, favorite features, and opportunities for the "Invisible CRM" concepts. Provide:
- Top 5 themes (with 1-line evidence)
- What satisfied vs. dissatisfied users say (contrast)
- Quick wins we can ship in 2 weeks
- Risks / unknowns to validate next
Return concise bullet points.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You write crisp, actionable product insights.' },
          { role: 'user', content: `${prompt}\n\nJSON:\n${JSON.stringify(payload).slice(0, 100000)}` },
        ],
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content || '';
    return NextResponse.json({ insights: out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}


