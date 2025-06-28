-- PostgreSQL schema for SHOUT MVP

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
  session_id SERIAL PRIMARY KEY,
  dj_id INTEGER NOT NULL,
  venue_name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  session_code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE requests (
  request_id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  song_title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  vote_count INTEGER DEFAULT 1,
  timestamp TIMESTAMP DEFAULT NOW(),
  played BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE
);

CREATE TABLE votes (
  vote_id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES requests(request_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
); 