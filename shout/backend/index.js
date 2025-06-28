import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT;

app.use(cors({
  origin: 'https://joinshout.fyi',
  credentials: true
}));

app.use(express.json());

// ✅ NEW: add test route to confirm backend is live
app.get('/', (req, res) => {
  res.send('✅ Backend is running!');
});

app.get('/sessions', (req, res) => {
  res.send('✅ Sessions route works!');
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
