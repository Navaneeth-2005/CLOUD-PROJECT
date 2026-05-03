const rateLimit = require('express-rate-limit');

// General API rate limit — all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // increased for development
  message: {
    status: 429,
    message: 'Too many requests, please try again after 15 minutes'
  }
});

// Auth limit — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // increased for development
  message: {
    status: 429,
    message: 'Too many login attempts, please try again after 15 minutes'
  }
});

// Submission limit
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // increased for development
  message: {
    status: 429,
    message: 'Too many submissions, please wait a minute'
  }
});

module.exports = { generalLimiter, authLimiter, submissionLimiter };