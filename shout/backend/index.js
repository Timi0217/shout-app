const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: 'https://joinshout.fyi',
  credentials: true
}));
app.options('*', cors({ origin: 'https://joinshout.fyi', credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('🚨 THIS IS THE NEWEST DEPLOY 🚨');
});

app.get('/sessions', (req, res) => {
  res.json({ status: 'success', sessions: ['test-session'] });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
//test// force redeploy
