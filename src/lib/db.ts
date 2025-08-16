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
}


