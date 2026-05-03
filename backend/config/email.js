const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendContestCredentials = async (toEmail, candidateName, contestTitle, contestDetails) => {
  const mailOptions = {
    from: `"CodeStorm" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎯 You're registered for ${contestTitle} — CodeStorm`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f0f4f8; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #0f0c29, #302b63); padding: 40px; text-align: center; }
          .logo { font-size: 28px; font-weight: 800; color: #4fc3f7; letter-spacing: 1px; }
          .header-sub { color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 8px; }
          .body { padding: 40px; }
          .greeting { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
          .message { font-size: 14px; color: #666; line-height: 1.7; margin-bottom: 30px; }
          .credentials-box { background: #f8f9fa; border-radius: 14px; padding: 24px; margin-bottom: 24px; border: 1px solid #e0e0e0; }
          .cred-title { font-size: 13px; font-weight: 700; color: #4fc3f7; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }
          .cred-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e8e8e8; }
          .cred-item:last-child { border-bottom: none; }
          .cred-label { font-size: 13px; color: #888; }
          .cred-value { font-size: 13px; font-weight: 600; color: #1a1a2e; }
          .highlight { background: linear-gradient(135deg, #4fc3f7, #0288d1); color: white; padding: 2px 10px; border-radius: 6px; font-family: monospace; }
          .contest-box { background: linear-gradient(135deg, #0f0c29, #302b63); border-radius: 14px; padding: 24px; margin-bottom: 24px; }
          .contest-title { font-size: 18px; font-weight: 700; color: white; margin-bottom: 16px; }
          .contest-detail { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
          .contest-detail-label { font-size: 12px; color: rgba(255,255,255,0.6); width: 80px; }
          .contest-detail-value { font-size: 13px; color: white; font-weight: 500; }
          .btn { display: block; text-align: center; background: linear-gradient(135deg, #4fc3f7, #0288d1); color: white; padding: 14px 30px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
          .warning { background: #fff8e1; border: 1px solid #f59e0b; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px; }
          .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">⚡ CodeStorm</div>
            <div class="header-sub">Cloud-Based Coding Assessment Platform</div>
          </div>

          <div class="body">
            <div class="greeting">Hey ${candidateName}! 👋</div>
            <div class="message">
              You have successfully registered for the contest below. 
              Here are your login credentials and contest details. 
              Please keep this email safe — do not share your credentials with anyone.
            </div>

            <div class="credentials-box">
              <div class="cred-title">🔐 Your Login Credentials</div>
              <div class="cred-item">
                <span class="cred-label">Email</span>
                <span class="cred-value">${toEmail}</span>
              </div>
              <div class="cred-item">
                <span class="cred-label">Password</span>
                <span class="cred-value"><span class="highlight">${contestDetails.password}</span></span>
              </div>
              <div class="cred-item">
                <span class="cred-label">Platform</span>
                <span class="cred-value">codestorm.io</span>
              </div>
            </div>

            <div class="contest-box">
              <div class="contest-title">🏆 ${contestTitle}</div>
              <div class="contest-detail">
                <span class="contest-detail-label">📅 Start</span>
                <span class="contest-detail-value">${contestDetails.startTime}</span>
              </div>
              <div class="contest-detail">
                <span class="contest-detail-label">🏁 End</span>
                <span class="contest-detail-value">${contestDetails.endTime}</span>
              </div>
              <div class="contest-detail">
                <span class="contest-detail-label">❓ Questions</span>
                <span class="contest-detail-value">${contestDetails.questionCount} questions</span>
              </div>
            </div>

            <div class="warning">
              ⚠️ <strong>Important:</strong> Do not share your credentials. 
              Tab switching and suspicious activity will be automatically detected and flagged.
            </div>

            <a href="http://localhost:5173/login" class="btn">
              Login to CodeStorm →
            </a>
          </div>

          <div class="footer">
            © 2026 CodeStorm. This is an automated email — please do not reply.<br/>
            If you did not register for this contest, please ignore this email.
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendContestCredentials };