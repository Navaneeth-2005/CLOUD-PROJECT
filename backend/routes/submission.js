const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const Contest = require('../models/Contest');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { sqsClient, s3Client } = require('../config/aws');
const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const ContestRegistration = require('../models/ContestRegistration');

// Submit code (only candidates)
router.post('/submit', authMiddleware, roleMiddleware('candidate'), async (req, res) => {
  try {
    const { contestId, questionId, language, code } = req.body;

    // Check contest exists
    const contest = await Contest.findByPk(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Check question exists
    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check contest is still active
    const now = new Date();
    if (now < new Date(contest.startTime) || now > new Date(contest.endTime)) {
      return res.status(400).json({ message: 'Contest is not active right now' });
    }

    // Check if candidate already submitted (finalized) the contest
    const registration = await ContestRegistration.findOne({
      where: { userId: req.user.id, contestId }
    });
    if (registration && registration.submittedAt) {
      return res.status(400).json({ message: 'You have already submitted this contest. No further submissions allowed.' });
    }

    // Save submission with pending status
    const submission = await Submission.create({
      userId: req.user.id,
      contestId,
      questionId,
      language,
      code,
      status: 'pending',
      totalTestCases: 0,
      testCasesPassed: 0
    });

    // Send to SQS
    let s3Key = null;
    if (process.env.S3_BUCKET_NAME) {
      try {
        s3Key = `submissions/${contestId}/${questionId}/${req.user.id}_${Date.now()}.txt`;
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
          Body: code
        }));
        console.log(`☁️ Uploaded code to S3: ${s3Key}`);
      } catch (s3Err) {
        console.error('❌ Failed to upload to S3:', s3Err.message);
      }
    }

    if (process.env.SQS_QUEUE_URL) {
      try {
        const command = new SendMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MessageBody: JSON.stringify({ submissionId: submission.id, s3Key })
        });
        await sqsClient.send(command);
        console.log(`📤 Enqueued submission ${submission.id} to SQS`);
      } catch (sqsErr) {
        console.error('❌ Failed to enqueue to SQS:', sqsErr.message);
      }
    }

    res.status(201).json({
      message: 'Code submitted successfully',
      submissionId: submission.id,
      status: submission.status
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get submission status by ID
router.get('/status/:id', authMiddleware, async (req, res) => {
  try {
    const submission = await Submission.findByPk(req.params.id, {
      include: [
        { association: 'question' },
        { association: 'contest' }
      ]
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Candidates can only see their own submissions
    if (req.user.role === 'candidate' && submission.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all submissions by logged in candidate
router.get('/my-submissions', authMiddleware, roleMiddleware('candidate'), async (req, res) => {
  try {
    const submissions = await Submission.findAll({
      where: { userId: req.user.id },
      include: [
        { association: 'question' },
        { association: 'contest' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all submissions for a contest (company/admin only)
router.get('/contest/:contestId', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const submissions = await Submission.findAll({
      where: { contestId: req.params.contestId },
      include: [
        { association: 'candidate' },
        { association: 'question' }
      ],
      order: [['score', 'DESC']]
    });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;