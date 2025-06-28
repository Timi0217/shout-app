const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS MUST BE FIRST
app.use(cors({
  origin: 'https://joinshout.fyi',
  credentials: true
}));
app.options('*', cors({ origin: 'https://joinshout.fyi', credentials: true }));

app.use(express.json());

// Catch-all logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.send('🚨 THIS IS THE NEWEST DEPLOY 🚨');
});

app.get('/test', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/sessions', (req, res) => {
  res.json({ status: 'success', sessions: ['test-session'] });
});

app.post('/sessions', (req, res) => {
  console.log('POST /sessions hit');
  console.log('Request body:', req.body);
  res.json({ status: 'created', data: req.body });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
//test// force redeploy
