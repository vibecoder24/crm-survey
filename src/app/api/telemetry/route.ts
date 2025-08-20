import { NextResponse } from 'next/server';
import { pool, ensureSchema } from '@/lib/db';

type Event = {
  sessionId: string;
  name?: string;
  email?: string;
  event: string; // session_start, page_view, question_view, question_next, submit_start, submit_ok, submit_error
  sectionId?: string;
  questionId?: string;
  fromQuestionId?: string;
  stepIndex?: number;
  msFromStart?: number;
  extra?: unknown;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Event | Event[];
  await ensureSchema();
  const items: Event[] = Array.isArray(body) ? body : [body];
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const e of items) {
      if (e.event === 'session_start') {
        await client.query(
          'insert into survey_sessions (session_id, name, email, meta) values ($1,$2,$3,$4) on conflict (session_id) do nothing',
          [e.sessionId, e.name || null, e.email || null, e.extra || {}],
        );
      }
      await client.query(
        'insert into survey_events (session_id, event, section_id, question_id, from_question_id, step_index, ms_from_start, extra) values ($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          e.sessionId,
          e.event,
          e.sectionId || null,
          e.questionId || null,
          e.fromQuestionId || null,
          e.stepIndex ?? null,
          e.msFromStart ?? null,
          e.extra || {},
        ],
      );
    }
    await client.query('commit');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('rollback');
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
}


