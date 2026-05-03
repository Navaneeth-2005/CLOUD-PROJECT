require('dotenv').config();
const { sendContestCredentials } = require('./config/email');

const test = async () => {
  try {
    await sendContestCredentials(
      'tammineedinavaneeth2@gmail.com',
      'Test User',
      'CodeStorm Round 1',
      {
        password: '123456',
        startTime: '1 May 2026, 10:00 AM',
        endTime: '1 May 2026, 12:00 PM',
        questionCount: 2
      }
    );
    console.log('✅ Email sent successfully!');
  } catch (err) {
    console.error('❌ Email failed:', err.message);
  }
};

test();