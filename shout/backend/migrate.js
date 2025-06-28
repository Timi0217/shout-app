const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id SERIAL PRIMARY KEY,
  dj_id UUID NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  session_code TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  request_id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  vote_count INTEGER DEFAULT 1,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  played BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS votes (
  vote_id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  vote_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add crowd column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='crowd') THEN
    ALTER TABLE sessions ADD COLUMN crowd INTEGER DEFAULT 1;
  END IF;
END$$;
`;

pool.query(migration)
  .then(() => {
    console.log('Migration complete!');
    pool.end();
  })
  .catch(err => {
    console.error('Migration error:', err);
    pool.end();
  }); 