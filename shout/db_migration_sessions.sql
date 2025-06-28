-- Migration: Create sessions table with unique session_code
CREATE TABLE IF NOT EXISTS sessions (
  session_id SERIAL PRIMARY KEY,
  dj_id INTEGER NOT NULL,
  venue_name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  session_code VARCHAR(10) UNIQUE NOT NULL
);

-- Alter votes.timestamp to TIMESTAMPTZ with default NOW()
ALTER TABLE votes ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp::timestamptz;
ALTER TABLE votes ALTER COLUMN timestamp SET DEFAULT NOW();

-- Add vote_type column to votes table for up/down votes
ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_type TEXT;

-- Alter requests.timestamp to TIMESTAMPTZ with default NOW()
ALTER TABLE requests ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp::timestamptz;
ALTER TABLE requests ALTER COLUMN timestamp SET DEFAULT NOW();

-- Reset all votes, requests, and sessions
DELETE FROM votes;
DELETE FROM requests;
DELETE FROM sessions; 