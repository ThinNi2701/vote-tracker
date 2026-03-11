const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const electionsRouter = require('./routes/elections.routes');
const authRouter = require('./routes/auth.routes');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/elections', electionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vote Tracker backend is running' });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
