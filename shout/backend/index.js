const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  'https://joinshout.fyi',
  'https://www.joinshout.fyi',
  'http://localhost:3000'
];

// Enhanced CORS configuration - MUST BE FIRST
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Handle preflight requests for ALL routes
app.options('*', cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

app.use(express.json());

// Catch-all logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log('Headers:', req.headers);
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

app.post('/sessions', (req, res) => {
  console.log('POST /sessions hit');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  try {
    // Process the request
    const { dj_id, venue_name, status } = req.body;
    // Generate a mock session ID for now
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

// Verification endpoint
app.post('/verify', (req, res) => {
  console.log('POST /verify hit');
  console.log('Request body:', req.body);
  const { code } = req.body;
  // Mock verification - accept any 6-digit code
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🎵 SHOUT Backend listening on port ${PORT}`);
  console.log(`🚀 CORS enabled for: https://joinshout.fyi and https://www.joinshout.fyi`);
  console.log(`📊 Health check: /health`);
});
//test// force redeploy
