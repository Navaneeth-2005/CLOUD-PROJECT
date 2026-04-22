const rateLimit = require('express-rate-limit');

// General API rate limit — all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 mins per IP
  message: {
    status: 429,
    message: 'Too many requests, please try again after 15 minutes'
  }
});

// Strict limit for auth routes — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login/register attempts per 15 mins
  message: {
    status: 429,
    message: 'Too many login attempts, please try again after 15 minutes'
  }
});

// Submission limit — prevent code spam
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 submissions per minute
  message: {
    status: 429,
    message: 'Too many submissions, please wait a minute before submitting again'
  }
});

module.exports = { generalLimiter, authLimiter, submissionLimiter };