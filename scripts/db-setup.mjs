import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url = readFileSync(new URL("../.env", import.meta.url), "utf8")
  .match(/DATABASE_URL="(.*)"/)?.[1];
if (!url) throw new Error("DATABASE_URL missing in .env");

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS forms (
    id text PRIMARY KEY,
    title text NOT NULL DEFAULT 'Untitled form',
    status text NOT NULL DEFAULT 'draft',
    draft_schema jsonb NOT NULL,
    published_schema jsonb,
    theme jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
  )`;

await sql`
  CREATE TABLE IF NOT EXISTS responses (
    id text PRIMARY KEY,
    form_id text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    answers jsonb NOT NULL,
    completed boolean NOT NULL DEFAULT true,
    user_agent text,
    referrer text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;

await sql`ALTER TABLE responses ADD COLUMN IF NOT EXISTS session_id text`;
await sql`ALTER TABLE responses ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
await sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS notify_email text`;

await sql`
  CREATE TABLE IF NOT EXISTS form_views (
    id text PRIMARY KEY,
    form_id text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    referrer text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

console.log("Leapform tables ready (created if missing, nothing else touched).");
