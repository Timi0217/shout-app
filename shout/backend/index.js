const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Simple but effective CORS setup
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('Request from origin:', origin);
  // Allow all joinshout.fyi variations and localhost
  if (origin && (origin.includes('joinshout.fyi') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

app.post('/sessions', (req, res) => {
  console.log('POST /sessions hit');
  console.log('Request body:', req.body);
  console.log('Origin:', req.headers.origin);
  try {
    const { dj_id, venue_name, status } = req.body;
    // Generate session ID
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const session = {
      id: sessionId,
      dj_id: dj_id,
      venue_name: venue_name,
      status: status || 'live',
      created_at: new Date().toISOString(),
      session_code: sessionId
    };
    console.log('Created session:', session);
    res.json({ 
      status: 'created', 
      success: true,
      session: session,
      session_id: sessionId
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      status: 'error',
      success: false,
      error: error.message
    });
  }
});

app.post('/verify', (req, res) => {
  console.log('POST /verify hit');
  console.log('Request body:', req.body);
  const { code } = req.body;
  // Accept any 6-digit code for testing
  if (code && code.length === 6) {
    res.json({
      success: true,
      message: 'Code verified successfully',
      verified: true
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid verification code',
      verified: false
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

app.listen(PORT, () => {
  console.log(`🎵 SHOUT Backend listening on port ${PORT}`);
  console.log(`🚀 CORS enabled for all joinshout.fyi variations`);
  console.log(`📊 Health check: /health`);
});
//test// force redeploy 2
