const express = require('express');
const db = require('./db');
const { spotifySearch } = require('./spotify');
const generateSessionCode = require('./sessionCode');

const app = express();
const PORT = process.env.PORT || 8080;

// Secure CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://joinshout.fyi',
    'https://www.joinshout.fyi',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://192.168.0.242:4000',
    'http://192.168.0.242:3000',
    'http://192.168.0.242:8081'
  ];
  
  // Only allow specific origins in production
  if (process.env.NODE_ENV === 'production') {
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    // Allow all origins in development
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

//test

app.use(express.json({ limit: '10mb' }));

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
};

// Simple validation schemas
const sessionSchema = {
  validate: (data) => {
    const errors = [];
    if (!data.dj_id || typeof data.dj_id !== 'string') {
      errors.push({ message: 'dj_id is required and must be a string' });
    }
    if (data.status && typeof data.status !== 'string') {
      errors.push({ message: 'status must be a string' });
    }
    return { error: errors.length > 0 ? { details: errors } : null };
  }
};

const requestSchema = {
  validate: (data) => {
    const errors = [];
    if (!data.song_title || typeof data.song_title !== 'string' || data.song_title.trim().length === 0) {
      errors.push({ message: 'song_title is required and must be a non-empty string' });
    }
    if (!data.artist || typeof data.artist !== 'string' || data.artist.trim().length === 0) {
      errors.push({ message: 'artist is required and must be a non-empty string' });
    }
    if (!data.user_id || typeof data.user_id !== 'string') {
      errors.push({ message: 'user_id is required and must be a string' });
    }
    return { error: errors.length > 0 ? { details: errors } : null };
  }
};

const voteSchema = {
  validate: (data) => {
    const errors = [];
    if (!data.user_id || typeof data.user_id !== 'string') {
      errors.push({ message: 'user_id is required and must be a string' });
    }
    return { error: errors.length > 0 ? { details: errors } : null };
  }
};

// Logging middleware - reduced in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${req.method}] ${req.originalUrl} from ${req.headers.origin}`);
  }
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
  res.json({ 
    status: 'success', 
    sessions: ['test-session'],
    timestamp: new Date().toISOString()
  });
});

app.post('/sessions', validateInput(sessionSchema), async (req, res) => {
  try {
    const { dj_id, status } = req.body;
    const session_code = generateSessionCode ? generateSessionCode(6) : Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const result = await db.query(
      'INSERT INTO sessions (dj_id, status, session_code) VALUES ($1, $2, $3) RETURNING *',
      [dj_id, status || 'live', session_code]
    );
    const session = result.rows[0];
    
    res.json({
      status: 'created',
      success: true,
      session,
      session_id: session.session_code // for compatibility with frontend
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Session creation error:', error);
    }
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      status: 'error',
      success: false,
      error: error.message,
      ...(isDevelopment && { stack: error.stack })
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
  const code = session_code.toUpperCase();
  const result = await db.query('SELECT session_id FROM sessions WHERE session_code = $1', [code]);
  if (result.rows.length === 0) throw new Error('Session not found');
  return result.rows[0].session_id;
}

// Helper to send appropriate error details in API responses
function sendFullError(res, err, fallback) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: err.message || fallback,
    ...(isDevelopment && { stack: err.stack })
  });
}

// In-memory usage tracking (for demo; use Redis or DB for production)
const usageStore = {};
const ADD_LIMIT = 3;
const UPVOTE_LIMIT = 5;
const DOWNVOTE_LIMIT = 2;
const COOLDOWN_SECONDS = 60 * 5; // 5 minutes

function getUsageKey(session_id, user_id) {
  return `${session_id}:${user_id}`;
}

function getOrInitUsage(session_id, user_id) {
  const key = getUsageKey(session_id, user_id);
  if (!usageStore[key]) {
    usageStore[key] = {
      adds: [], // timestamps
      upvotes: [],
      downvotes: [],
    };
  }
  return usageStore[key];
}

// Helper to clean up old timestamps
function pruneUsage(arr) {
  const now = Date.now();
  return arr.filter(ts => now - ts < COOLDOWN_SECONDS * 1000);
}

// --- SONG REQUEST QUEUE ENDPOINTS ---
// Get song queue for a session
app.get('/sessions/:session_id/requests', async (req, res) => {
  try {
    const session_code = req.params.session_id.toUpperCase();
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
app.post('/sessions/:session_id/requests', validateInput(requestSchema), async (req, res) => {
  try {
    const session_code = req.params.session_id.toUpperCase();
    const session_id = await getSessionIdFromCode(session_code);
    const { song_title, artist, user_id } = req.body;
    // Check if this user has made any requests in this session before
    const existingRequests = await db.query(
      'SELECT COUNT(*) as count FROM requests WHERE session_id = $1 AND user_id = $2',
      [session_id, user_id]
    );
    const isFirstRequest = parseInt(existingRequests.rows[0].count) === 0;
    const usage = getOrInitUsage(session_id, user_id);
    usage.adds = pruneUsage(usage.adds);
    if (usage.adds.length >= ADD_LIMIT) {
      return res.status(429).json({ error: 'Add limit reached. Please wait for cooldown.' });
    }
    usage.adds.push(Date.now());
    const result = await db.query(
      'INSERT INTO requests (session_id, user_id, song_title, artist) VALUES ($1, $2, $3, $4) RETURNING *',
      [session_id, user_id, song_title, artist]
    );
    // Increment crowd count for first-time users
    if (isFirstRequest) {
      await db.query('UPDATE sessions SET crowd = crowd + 1 WHERE session_id = $1', [session_id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    sendFullError(res, err, 'Failed to add song request');
  }
});

// Remove a song request
app.delete('/sessions/:session_id/requests/:request_id', async (req, res) => {
  try {
    const session_code = req.params.session_id.toUpperCase();
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
app.post('/requests/:request_id/upvote', validateInput(voteSchema), async (req, res) => {
  try {
    const { request_id } = req.params;
    const { user_id } = req.body;
    // Prevent self-voting
    const requestOwner = await db.query('SELECT user_id FROM requests WHERE request_id = $1', [request_id]);
    if (requestOwner.rows.length && requestOwner.rows[0].user_id === user_id) {
      return res.status(403).json({ error: "You can't vote on your own song request." });
    }
    // Find session_id for this request
    const result = await db.query('SELECT session_id FROM requests WHERE request_id = $1', [request_id]);
    if (result.rows.length === 0) throw new Error('Request not found');
    const session_id = result.rows[0].session_id;
    const usage = getOrInitUsage(session_id, user_id);
    usage.upvotes = pruneUsage(usage.upvotes);
    if (usage.upvotes.length >= UPVOTE_LIMIT) {
      return res.status(429).json({ error: 'Upvote limit reached. Please wait for cooldown.' });
    }
    usage.upvotes.push(Date.now());
    await db.query('UPDATE requests SET vote_count = vote_count + 1 WHERE request_id = $1', [request_id]);
    await db.query('INSERT INTO votes (request_id, user_id, vote_type) VALUES ($1, $2, $3)', [request_id, user_id, 'upvote']);
    res.json({ success: true });
  } catch (err) {
    sendFullError(res, err, 'Failed to upvote');
  }
});

// Downvote a song request
app.post('/requests/:request_id/downvote', validateInput(voteSchema), async (req, res) => {
  try {
    const { request_id } = req.params;
    const { user_id } = req.body;
    // Prevent self-voting
    const requestOwner = await db.query('SELECT user_id FROM requests WHERE request_id = $1', [request_id]);
    if (requestOwner.rows.length && requestOwner.rows[0].user_id === user_id) {
      return res.status(403).json({ error: "You can't vote on your own song request." });
    }
    // Find session_id for this request
    const result = await db.query('SELECT session_id FROM requests WHERE request_id = $1', [request_id]);
    if (result.rows.length === 0) throw new Error('Request not found');
    const session_id = result.rows[0].session_id;
    const usage = getOrInitUsage(session_id, user_id);
    usage.downvotes = pruneUsage(usage.downvotes);
    if (usage.downvotes.length >= DOWNVOTE_LIMIT) {
      return res.status(429).json({ error: 'Downvote limit reached. Please wait for cooldown.' });
    }
    usage.downvotes.push(Date.now());
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
    const session_code = req.params.session_id.toUpperCase();
    const user_id = req.params.user_id;
    const session_id = await getSessionIdFromCode(session_code);
    const usage = getOrInitUsage(session_id, user_id);
    usage.adds = pruneUsage(usage.adds);
    const adds_left = Math.max(0, ADD_LIMIT - usage.adds.length);
    let add_reset_seconds = 0;
    if (usage.adds.length >= ADD_LIMIT) {
      add_reset_seconds = Math.ceil((usage.adds[0] + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    }
    res.json({ adds_left, add_reset_seconds });
  } catch (err) {
    sendFullError(res, err, 'Failed to get add usage');
  }
});
app.get('/sessions/:session_id/vote-usage/:user_id', async (req, res) => {
  try {
    const session_code = req.params.session_id.toUpperCase();
    const user_id = req.params.user_id;
    const session_id = await getSessionIdFromCode(session_code);
    const usage = getOrInitUsage(session_id, user_id);
    usage.upvotes = pruneUsage(usage.upvotes);
    usage.downvotes = pruneUsage(usage.downvotes);
    const upvotes_left = Math.max(0, UPVOTE_LIMIT - usage.upvotes.length);
    const downvotes_left = Math.max(0, DOWNVOTE_LIMIT - usage.downvotes.length);
    let upvote_reset_seconds = 0;
    let downvote_reset_seconds = 0;
    if (usage.upvotes.length >= UPVOTE_LIMIT) {
      upvote_reset_seconds = Math.ceil((usage.upvotes[0] + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    }
    if (usage.downvotes.length >= DOWNVOTE_LIMIT) {
      downvote_reset_seconds = Math.ceil((usage.downvotes[0] + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    }
    res.json({ upvotes_left, downvotes_left, upvote_reset_seconds, downvote_reset_seconds });
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

// Join session by code (for frontend join flow)
app.get('/sessions/:session_code', async (req, res) => {
  try {
    const session_code = req.params.session_code.toUpperCase();
    const result = await db.query('SELECT * FROM sessions WHERE session_code = $1', [session_code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Session lookup error:', error);
    }
    res.status(500).json({ error: error.message });
  }
});

// Join session and recalculate crowd count based on unique users
app.post('/sessions/:session_code/join', async (req, res) => {
  try {
    const session_code = req.params.session_code.toUpperCase();
    const { user_id } = req.body;

    // Get session ID
    const sessionResult = await db.query('SELECT session_id FROM sessions WHERE session_code = $1', [session_code]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session_id = sessionResult.rows[0].session_id;

    // Count unique users who have done ANYTHING in this session (add, vote, or just joined)
    const uniqueUsersResult = await db.query(`
      SELECT COUNT(DISTINCT user_id) as unique_count FROM (
        SELECT user_id FROM requests WHERE session_id = $1
        UNION
        SELECT user_id FROM votes v 
        JOIN requests r ON v.request_id = r.request_id 
        WHERE r.session_id = $1
        UNION
        SELECT $2 as user_id  -- Include the current joining user
      ) as all_users
    `, [session_id, user_id]);

    const uniqueCount = parseInt(uniqueUsersResult.rows[0].unique_count);

    // Update crowd count to reflect actual unique users
    await db.query('UPDATE sessions SET crowd = $1 WHERE session_id = $2', [uniqueCount, session_id]);

    // Return updated session
    const updatedSession = await db.query('SELECT * FROM sessions WHERE session_code = $1', [session_code]);
    res.json(updatedSession.rows[0]);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Join session error:', error);
    }
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎵 SHOUT Backend listening on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 CORS configured for allowed origins`);
    console.log(`📊 Health check: /health`);
  }
}); 
//test// CORS fix wildcard approach
