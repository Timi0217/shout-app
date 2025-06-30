const express = require('express');
const db = require('./db');
const { spotifySearch } = require('./spotify');
const generateSessionCode = require('./sessionCode');

const app = express();
const PORT = process.env.PORT || 8080;

// SIMPLE CORS - echo origin for joinshout.fyi, wildcard for others
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Log for debugging
  console.log('Request from origin:', origin);
  // Handle both www and non-www versions
  if (origin && origin.includes('joinshout.fyi')) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Use the exact origin
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Fallback wildcard
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  res.setHeader('Access-Control-Max-Age', '86400');
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight for:', req.url);
    return res.status(200).end();
  }
  next();
});

//test

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} from ${req.headers.origin}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    message: '🚨 SHOUT Backend Live! 🚨',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    cors: 'working'
  });
});

app.get('/sessions', (req, res) => {
  console.log('GET /sessions called');
  res.json({ 
    status: 'success', 
    sessions: ['test-session'],
    timestamp: new Date().toISOString()
  });
});

app.post('/sessions', async (req, res) => {
  try {
    const { dj_id, venue_name, status } = req.body;
    const session_code = generateSessionCode ? generateSessionCode(6) : Math.random().toString(36).substring(2, 8).toUpperCase();
    const result = await db.query(
      'INSERT INTO sessions (dj_id, venue_name, status, session_code) VALUES ($1, $2, $3, $4) RETURNING *',
      [dj_id, venue_name || '', status || 'live', session_code]
    );
    const session = result.rows[0];
    res.json({
      status: 'created',
      success: true,
      session,
      session_id: session.session_code // for compatibility with frontend
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      status: 'error',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper to get integer session_id from session_code
async function getSessionIdFromCode(session_code) {
  const result = await db.query('SELECT session_id FROM sessions WHERE session_code = $1', [session_code]);
  if (result.rows.length === 0) throw new Error('Session not found');
  return result.rows[0].session_id;
}

// Helper to send full error details in API responses
function sendFullError(res, err, fallback) {
  res.status(500).json({
    error: err.message || fallback,
    stack: err.stack || null
  });
}

// --- SONG REQUEST QUEUE ENDPOINTS ---
// Get song queue for a session
app.get('/sessions/:session_id/requests', async (req, res) => {
  try {
    const session_code = req.params.session_id;
    const session_id = await getSessionIdFromCode(session_code);
    const result = await db.query(
      'SELECT * FROM requests WHERE session_id = $1 ORDER BY vote_count DESC, timestamp ASC',
      [session_id]
    );
    res.json(result.rows);
  } catch (err) {
    sendFullError(res, err, 'Failed to fetch queue');
  }
});

// Add a song request to a session
app.post('/sessions/:session_id/requests', async (req, res) => {
  try {
    const session_code = req.params.session_id;
    const session_id = await getSessionIdFromCode(session_code);
    const { song_title, artist, user_id } = req.body;
    const result = await db.query(
      'INSERT INTO requests (session_id, user_id, song_title, artist) VALUES ($1, $2, $3, $4) RETURNING *',
      [session_id, user_id, song_title, artist]
    );
    res.json(result.rows[0]);
  } catch (err) {
    sendFullError(res, err, 'Failed to add song request');
  }
});

// Remove a song request
app.delete('/sessions/:session_id/requests/:request_id', async (req, res) => {
  try {
    const session_code = req.params.session_id;
    const session_id = await getSessionIdFromCode(session_code); // for validation, not used in query
    const { request_id } = req.params;
    await db.query('DELETE FROM requests WHERE request_id = $1', [request_id]);
    res.json({ success: true });
  } catch (err) {
    sendFullError(res, err, 'Failed to remove song request');
  }
});

// --- VOTING ENDPOINTS ---
// Upvote a song request
app.post('/requests/:request_id/upvote', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { user_id } = req.body;
    await db.query('UPDATE requests SET vote_count = vote_count + 1 WHERE request_id = $1', [request_id]);
    await db.query('INSERT INTO votes (request_id, user_id, vote_type) VALUES ($1, $2, $3)', [request_id, user_id, 'upvote']);
    res.json({ success: true });
  } catch (err) {
    sendFullError(res, err, 'Failed to upvote');
  }
});

// Downvote a song request
app.post('/requests/:request_id/downvote', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { user_id } = req.body;
    await db.query('UPDATE requests SET vote_count = vote_count - 1 WHERE request_id = $1', [request_id]);
    await db.query('INSERT INTO votes (request_id, user_id, vote_type) VALUES ($1, $2, $3)', [request_id, user_id, 'downvote']);
    res.json({ success: true });
  } catch (err) {
    sendFullError(res, err, 'Failed to downvote');
  }
});

// --- USAGE ENDPOINTS (dummy, always allow 3 adds/upvotes, 1 downvote) ---
app.get('/sessions/:session_id/add-usage/:user_id', async (req, res) => {
  try {
    const session_code = req.params.session_id;
    await getSessionIdFromCode(session_code); // for validation
    res.json({ adds_left: 3, add_reset_seconds: 0 });
  } catch (err) {
    sendFullError(res, err, 'Failed to get add usage');
  }
});
app.get('/sessions/:session_id/vote-usage/:user_id', async (req, res) => {
  try {
    const session_code = req.params.session_id;
    await getSessionIdFromCode(session_code); // for validation
    res.json({ upvotes_left: 3, downvotes_left: 1, upvote_reset_seconds: 0, downvote_reset_seconds: 0 });
  } catch (err) {
    sendFullError(res, err, 'Failed to get vote usage');
  }
});

// --- SPOTIFY SEARCH ENDPOINT ---
app.get('/spotify/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Missing query' });
    const data = await spotifySearch(q);
    res.json(data);
  } catch (err) {
    sendFullError(res, err, 'Spotify search failed');
  }
});

app.listen(PORT, () => {
  console.log(`🎵 SHOUT Backend listening on port ${PORT}`);
  console.log(`🚀 CORS enabled for ALL origins (debugging mode)`);
  console.log(`📊 Health check: /health`);
}); 
//test// CORS fix wildcard approach
