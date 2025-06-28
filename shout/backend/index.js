const express = require('express');
const cors = require('cors');
const db = require('./db');
const generateSessionCode = require('./sessionCode');
const { spotifySearch } = require('./spotify');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create a new session (DJ)
app.post('/sessions', async (req, res) => {
  const { dj_id, start_time, status } = req.body;
  if (!dj_id || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Ensure user exists in users table
    await db.query(
      'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [dj_id]
    );
  } catch (err) {
    return res.status(500).json({ error: 'Failed to ensure user exists: ' + err.message });
  }
  let sessionCode;
  let exists = true;
  // Ensure unique session code
  while (exists) {
    sessionCode = generateSessionCode().toUpperCase();
    const result = await db.query('SELECT 1 FROM sessions WHERE session_code = $1', [sessionCode]);
    exists = result.rows.length > 0;
  }
  try {
    const result = await db.query(
      'INSERT INTO sessions (dj_id, start_time, status, session_code) VALUES ($1, $2, $3, $4) RETURNING *',
      [dj_id, start_time || new Date(), status, sessionCode]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a session by code
app.get('/sessions/:session_code', async (req, res) => {
  const { session_code } = req.params;
  const normalizedCode = session_code.toUpperCase();
  try {
    const result = await db.query('SELECT * FROM sessions WHERE session_code = $1', [normalizedCode]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spotify search endpoint
app.get('/spotify/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const data = await spotifySearch(q);
    res.json(data);
  } catch (err) {
    console.error('Spotify search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to update crowd size for a session
async function updateCrowd(session_id) {
  // Get unique user_ids from requests and votes for this session
  const requestUsers = await db.query('SELECT DISTINCT user_id FROM requests WHERE session_id = $1', [session_id]);
  const voteUsers = await db.query('SELECT DISTINCT user_id FROM votes WHERE request_id IN (SELECT request_id FROM requests WHERE session_id = $1)', [session_id]);
  const userSet = new Set();
  requestUsers.rows.forEach(row => userSet.add(row.user_id));
  voteUsers.rows.forEach(row => userSet.add(row.user_id));
  // Also include the DJ
  const session = await db.query('SELECT dj_id FROM sessions WHERE session_id = $1', [session_id]);
  if (session.rows.length > 0) userSet.add(session.rows[0].dj_id);
  await db.query('UPDATE sessions SET crowd = $1 WHERE session_id = $2', [userSet.size, session_id]);
}

// Add a song request to a session
app.post('/sessions/:session_id/requests', async (req, res) => {
  const { session_id } = req.params;
  const { song_title, artist, user_id } = req.body;
  if (!song_title || !artist || !user_id) {
    return res.status(400).json({ error: 'Missing song_title, artist, or user_id' });
  }
  try {
    // Enforce 3 song adds per 5 minutes per user per session
    const addResult = await db.query(
      `SELECT timestamp FROM requests WHERE user_id = $1 AND session_id = $2 AND timestamp > NOW() - INTERVAL '5 minutes' ORDER BY timestamp ASC`,
      [user_id, session_id]
    );
    if (addResult.rows.length >= 3) {
      const firstAddTime = new Date(addResult.rows[0].timestamp);
      const add_reset_seconds = Math.max(0, Math.ceil((firstAddTime.getTime() + 5 * 60 * 1000 - Date.now()) / 1000));
      return res.status(403).json({ error: 'Add limit reached (3 per 5 min)', add_reset_seconds });
    }
    // Check if session exists
    const sessionResult = await db.query('SELECT * FROM sessions WHERE session_id = $1', [session_id]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No session found' });
    }
    const result = await db.query(
      'INSERT INTO requests (session_id, user_id, song_title, artist, vote_count) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [session_id, user_id, song_title, artist, 1]
    );
    // Update crowd size
    await updateCrowd(session_id);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get user's add-song usage and cooldown for a session
app.get('/sessions/:session_id/add-usage/:user_id', async (req, res) => {
  const { session_id, user_id } = req.params;
  try {
    // Count all requests in last 5 min, including deleted
    const addResult = await db.query(
      `SELECT timestamp FROM requests WHERE user_id = $1 AND session_id = $2 AND timestamp > NOW() - INTERVAL '5 minutes' ORDER BY timestamp ASC`,
      [user_id, session_id]
    );
    const adds_left = Math.max(3 - addResult.rows.length, 0);
    let add_reset_seconds = 0;
    if (addResult.rows.length >= 3) {
      const firstAddTime = new Date(addResult.rows[0].timestamp);
      add_reset_seconds = Math.max(0, Math.ceil((firstAddTime.getTime() + 5 * 60 * 1000 - Date.now()) / 1000));
    }
    res.json({ adds_left, add_reset_seconds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the current song queue for a session
app.get('/sessions/:session_id/requests', async (req, res) => {
  const { session_id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM requests WHERE session_id = $1 AND deleted = FALSE ORDER BY vote_count DESC, timestamp ASC',
      [session_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upvote a song request
app.post('/requests/:request_id/upvote', async (req, res) => {
  const { request_id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  try {
    // Get session_id for this request
    const reqResult = await db.query('SELECT session_id FROM requests WHERE request_id = $1', [request_id]);
    if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const session_id = reqResult.rows[0].session_id;
    // Count upvotes in last 5 min
    const upvoteCount = await db.query(
      `SELECT COUNT(*) FROM votes WHERE user_id = $1 AND request_id IN (SELECT request_id FROM requests WHERE session_id = $2) AND timestamp > NOW() - INTERVAL '5 minutes' AND vote_type = 'up'`,
      [user_id, session_id]
    );
    if (parseInt(upvoteCount.rows[0].count) >= 3) {
      return res.status(403).json({ error: 'Upvote limit reached (3 per 5 min)' });
    }
    // Add vote
    await db.query('INSERT INTO votes (request_id, user_id, vote_type) VALUES ($1, $2, $3)', [request_id, user_id, 'up']);
    await db.query('UPDATE requests SET vote_count = vote_count + 1 WHERE request_id = $1', [request_id]);
    // Update crowd size
    await updateCrowd(session_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Downvote a song request
app.post('/requests/:request_id/downvote', async (req, res) => {
  const { request_id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  try {
    // Get session_id for this request
    const reqResult = await db.query('SELECT session_id FROM requests WHERE request_id = $1', [request_id]);
    if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const session_id = reqResult.rows[0].session_id;
    // Count downvotes in last 5 min
    const downvoteCount = await db.query(
      `SELECT COUNT(*) FROM votes WHERE user_id = $1 AND request_id IN (SELECT request_id FROM requests WHERE session_id = $2) AND timestamp > NOW() - INTERVAL '5 minutes' AND vote_type = 'down'`,
      [user_id, session_id]
    );
    if (parseInt(downvoteCount.rows[0].count) >= 1) {
      return res.status(403).json({ error: 'Downvote limit reached (1 per 5 min)' });
    }
    // Add vote
    await db.query('INSERT INTO votes (request_id, user_id, vote_type) VALUES ($1, $2, $3)', [request_id, user_id, 'down']);
    await db.query('UPDATE requests SET vote_count = GREATEST(vote_count - 1, 0) WHERE request_id = $1', [request_id]);
    // Update crowd size
    await updateCrowd(session_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's vote usage for a session in the last 5 minutes
app.get('/sessions/:session_id/vote-usage/:user_id', async (req, res) => {
  const { session_id, user_id } = req.params;
  try {
    const upvoteResult = await db.query(
      `SELECT timestamp FROM votes WHERE user_id = $1 AND request_id IN (SELECT request_id FROM requests WHERE session_id = $2) AND vote_type = 'up' AND timestamp > NOW() - INTERVAL '5 minutes' ORDER BY timestamp ASC`,
      [user_id, session_id]
    );
    const downvoteResult = await db.query(
      `SELECT timestamp FROM votes WHERE user_id = $1 AND request_id IN (SELECT request_id FROM requests WHERE session_id = $2) AND vote_type = 'down' AND timestamp > NOW() - INTERVAL '5 minutes' ORDER BY timestamp ASC`,
      [user_id, session_id]
    );
    const upvotes_left = Math.max(3 - upvoteResult.rows.length, 0);
    const downvotes_left = Math.max(1 - downvoteResult.rows.length, 0);
    // Calculate seconds until next reset for upvote and downvote
    let upvote_reset_seconds = 0;
    let downvote_reset_seconds = 0;
    if (upvoteResult.rows.length >= 3) {
      const firstUpvoteTime = new Date(upvoteResult.rows[0].timestamp);
      upvote_reset_seconds = Math.max(0, Math.ceil((firstUpvoteTime.getTime() + 5 * 60 * 1000 - Date.now()) / 1000));
    }
    if (downvoteResult.rows.length >= 1) {
      const firstDownvoteTime = new Date(downvoteResult.rows[0].timestamp);
      downvote_reset_seconds = Math.max(0, Math.ceil((firstDownvoteTime.getTime() + 5 * 60 * 1000 - Date.now()) / 1000));
    }
    res.json({
      upvotes_left,
      downvotes_left,
      upvote_reset_seconds,
      downvote_reset_seconds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a song request from the queue (DJ only)
app.delete('/sessions/:session_id/requests/:request_id', async (req, res) => {
  const { session_id, request_id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  try {
    // Check if user is the DJ for this session
    const sessionResult = await db.query('SELECT dj_id FROM sessions WHERE session_id = $1', [session_id]);
    if (sessionResult.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    if (sessionResult.rows[0].dj_id !== user_id) return res.status(403).json({ error: 'Only the DJ can remove songs' });
    // Soft delete the request
    await db.query('UPDATE requests SET deleted = TRUE WHERE request_id = $1 AND session_id = $2', [request_id, session_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
}); 