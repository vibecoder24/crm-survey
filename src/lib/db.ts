import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  // Many managed Postgres providers (e.g., Neon) require TLS
  // Using a relaxed CA check for serverless environments
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
});

export async function ensureSchema() {
  await pool.query(`
    create table if not exists survey_responses (
      id text primary key,
      created_at timestamptz not null default now(),
      name text not null,
      email text not null,
      company text,
      answers jsonb not null,
      ratings jsonb,
      meta jsonb
    );
  `);

  // Lightweight analytics for drop-off and timing
  await pool.query(`
    create table if not exists survey_sessions (
      session_id text primary key,
      created_at timestamptz not null default now(),
      name text,
      email text,
      meta jsonb
    );
  `);

  await pool.query(`
    create table if not exists survey_events (
      id bigserial primary key,
      session_id text not null references survey_sessions(session_id) on delete cascade,
      ts timestamptz not null default now(),
      event text not null,
      section_id text,
      question_id text,
      from_question_id text,
      step_index int,
      ms_from_start int,
      extra jsonb
    );
  `);

  await pool.query(`create index if not exists idx_events_session on survey_events(session_id);`);
  await pool.query(`create index if not exists idx_events_question on survey_events(question_id);`);
}


