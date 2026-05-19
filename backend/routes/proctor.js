const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const ProctorSnapshot = require('../models/ProctorSnapshot');

// Setup S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const s3Bucket = process.env.S3_BUCKET_NAME;

const upload = multer({ storage: multer.memoryStorage() });

// Upload a proctor snapshot
router.post('/upload', authMiddleware, upload.single('snapshot'), async (req, res) => {
  try {
    const { contestId } = req.body;
    if (!contestId) return res.status(400).json({ message: 'contestId is required' });
    if (!req.file) return res.status(400).json({ message: 'Snapshot file is required' });

    const fileKey = `proctoring/contest_${contestId}/user_${req.user.id}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpeg`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'image/jpeg'
    }));

    // Save metadata to DB
    await ProctorSnapshot.create({
      contestId: parseInt(contestId),
      userId: req.user.id,
      s3Key: fileKey
    });

    res.json({ success: true, message: 'Proctor snapshot securely saved to AWS S3.' });
  } catch (error) {
    console.error('Proctor upload error:', error);
    res.status(500).json({ message: 'Failed to upload proctor snapshot' });
  }
});

// Company endpoint to fetch a candidate's proctor snapshots for a contest
router.get('/contest/:contestId/candidate/:userId', authMiddleware, roleMiddleware('company'), async (req, res) => {
  try {
    const { contestId, userId } = req.params;
    
    const snapshots = await ProctorSnapshot.findAll({
      where: { contestId, userId },
      order: [['timestamp', 'ASC']]
    });

    // Generate Pre-Signed URLs for each snapshot
    const snapshotsWithUrls = await Promise.all(snapshots.map(async (snap) => {
      const getCmd = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: snap.s3Key
      });
      // URL expires in 15 minutes
      const signedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 900 });
      return {
        id: snap.id,
        timestamp: snap.timestamp,
        url: signedUrl
      };
    }));

    res.json(snapshotsWithUrls);
  } catch (error) {
    console.error('Fetch snapshots error:', error);
    res.status(500).json({ message: 'Failed to fetch proctor snapshots' });
  }
});

module.exports = router;
