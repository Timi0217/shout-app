const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enhanced CORS configuration - MUST BE FIRST
app.use(cors({
  origin: ['https://joinshout.fyi', 'http://localhost:3000', 'https://www.joinshout.fyi'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Handle preflight requests for ALL routes
app.options('*', cors({
  origin: ['https://joinshout.fyi', 'http://localhost:3000', 'https://www.joinshout.fyi'],
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
  // Set CORS headers explicitly
  res.setHeader('Access-Control-Allow-Origin', 'https://joinshout.fyi');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({ 
    status: 'success', 
    sessions: ['test-session'],
    timestamp: new Date().toISOString()
  });
});

app.post('/sessions', (req, res) => {
  // Set CORS headers explicitly  
  res.setHeader('Access-Control-Allow-Origin', 'https://joinshout.fyi');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
  res.setHeader('Access-Control-Allow-Origin', 'https://joinshout.fyi');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
  console.log(`🚀 CORS enabled for: https://joinshout.fyi`);
  console.log(`📊 Health check: /health`);
});
//test// force redeploy
