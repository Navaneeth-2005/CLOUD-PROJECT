const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const sequelize = require('./config/db');
const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contest');
const submissionRoutes = require('./routes/submission');
const leaderboardRoutes = require('./routes/leaderboard');
const analyticsRoutes = require('./routes/analytics');
const cheatingRoutes = require('./routes/cheating');

const User = require('./models/User');
const Contest = require('./models/Contest');
const Question = require('./models/Question');
const Submission = require('./models/Submission');
const CheatingLog = require('./models/CheatingLog');

const { generalLimiter, authLimiter, submissionLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(generalLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeStorm backend is running!' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/submissions', submissionLimiter, submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cheating', cheatingRoutes);

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL connected!');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('✅ Tables synced!');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });