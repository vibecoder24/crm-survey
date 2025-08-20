import { NextResponse } from 'next/server';
import { pool, ensureSchema } from '@/lib/db';

export async function GET() {
  await ensureSchema();
  // Aggregate simple step metrics: views vs nexts, average dwell time
  const client = await pool.connect();
  try {
    const views = await client.query(
      `select question_id, count(*)::int as views from survey_events where event='question_view' and question_id is not null group by question_id`,
    );
    const nexts = await client.query(
      `select question_id, count(*)::int as nexts from survey_events where event='question_next' and question_id is not null group by question_id`,
    );
    const times = await client.query(
      `select question_id, avg((extra->>'dwellMs')::int)::int as avg_ms from survey_events where event='question_next' and question_id is not null group by question_id`,
    );
    const byQ: Record<string, { views: number; nexts: number; avgMs?: number }> = {};
    for (const r of views.rows) byQ[r.question_id] = { views: Number(r.views), nexts: 0 };
    for (const r of nexts.rows) {
      byQ[r.question_id] = { ...(byQ[r.question_id] || { views: 0, nexts: 0 }), nexts: Number(r.nexts) };
    }
    for (const r of times.rows) {
      byQ[r.question_id] = { ...(byQ[r.question_id] || { views: 0, nexts: 0 }), avgMs: r.avg_ms ? Number(r.avg_ms) : undefined };
    }
    const steps = Object.entries(byQ).map(([questionId, v]) => ({
      questionId,
      views: v.views,
      nexts: v.nexts,
      dropPct: v.views > 0 ? ((v.views - v.nexts) / v.views) * 100 : 0,
      avgMs: v.avgMs,
    }));
    return NextResponse.json({ steps });
  } finally {
    client.release();
  }
}


