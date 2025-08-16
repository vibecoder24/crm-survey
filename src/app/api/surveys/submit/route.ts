import { NextResponse } from 'next/server';
import { addResponse } from '@/data/store';
import { pool, ensureSchema } from '@/lib/db';

type SubmitBody = {
  name: string;
  email: string;
  company?: string;
  answers: { [questionId: string]: unknown };
  ratingGroup?: { [itemId: string]: number };
  meta?: { channel?: 'public' | 'token'; tokenId?: string };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitBody;
    if (!body?.name || !body?.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    const emailOk = /.+@.+/.test(body.email);
    if (!emailOk) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const saved = addResponse({
      name: body.name,
      email: body.email,
      company: body.company,
      answers: body.answers || {},
      ratingGroup: body.ratingGroup || {},
      aiGists: {},
      meta: body.meta || { channel: 'public' },
    });

    let warning: string | undefined;
    try {
      await ensureSchema();
      await pool.query(
        'insert into survey_responses (id, name, email, company, answers, ratings, meta) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing',
        [
          saved.id,
          saved.name,
          saved.email,
          saved.company || null,
          JSON.stringify(saved.answers),
          JSON.stringify(saved.ratingGroup || {}),
          JSON.stringify(saved.meta || {}),
        ],
      );
    } catch (e) {
      const err = e as { message?: string };
      warning = `Database warning: ${err?.message || 'unknown error'}`;
    }
    return NextResponse.json({ saved, warning });
  } catch (e) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}


