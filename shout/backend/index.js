const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;

app.use(cors({
  origin: 'https://joinshout.fyi',
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Backend is alive!');
});

app.get('/sessions', (req, res) => {
  res.json({ status: 'success', sessions: [] });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
