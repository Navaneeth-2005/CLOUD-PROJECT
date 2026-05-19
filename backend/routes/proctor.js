const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { RekognitionClient, DetectFacesCommand } = require('@aws-sdk/client-rekognition');
const crypto = require('crypto');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const ProctorSnapshot = require('../models/ProctorSnapshot');

// Setup AWS Clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Amazon Rekognition — NEW AWS service for AI face detection
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3Bucket = process.env.S3_BUCKET_NAME;
const upload = multer({ storage: multer.memoryStorage() });

// Upload a proctor snapshot -> S3 + Rekognition face check
router.post('/upload', authMiddleware, upload.single('snapshot'), async (req, res) => {
  try {
    const { contestId } = req.body;
    if (!contestId) return res.status(400).json({ message: 'contestId is required' });
    if (!req.file) return res.status(400).json({ message: 'Snapshot file is required' });

    const fileKey = `proctoring/contest_${contestId}/user_${req.user.id}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpeg`;

    // 1. Upload to Amazon S3
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'image/jpeg'
    }));

    // 2. Run Amazon Rekognition DetectFaces on the image buffer (new AWS service!)
    let faceCount = 0;
    let suspiciousActivity = false;
    let rekognitionAlert = null;

    try {
      const detectCmd = new DetectFacesCommand({
        Image: { Bytes: req.file.buffer },
        Attributes: ['DEFAULT']
      });
      const rekResult = await rekognitionClient.send(detectCmd);
      faceCount = rekResult.FaceDetails?.length || 0;

      if (faceCount === 0) {
        suspiciousActivity = true;
        rekognitionAlert = 'No face detected — candidate may have left the screen.';
      } else if (faceCount > 1) {
        suspiciousActivity = true;
        rekognitionAlert = `Multiple faces detected (${faceCount}) — possible external help.`;
      }
      console.log(`Rekognition: contest_${contestId} user_${req.user.id} -> ${faceCount} face(s) detected`);
    } catch (rekErr) {
      console.warn('Rekognition face detection skipped:', rekErr.message);
    }

    // 3. Save metadata + Rekognition results to DB
    await ProctorSnapshot.create({
      contestId: parseInt(contestId),
      userId: req.user.id,
      s3Key: fileKey,
      faceCount,
      suspiciousActivity,
      rekognitionAlert
    });

    res.json({ success: true, message: 'Snapshot saved to S3 and analysed by Amazon Rekognition.', faceCount, suspiciousActivity });
  } catch (error) {
    console.error('Proctor upload error:', error);
    res.status(500).json({ message: 'Failed to upload proctor snapshot' });
  }
});

// Company — get ALL snapshots for a contest (all candidates)
router.get('/contest/:contestId', authMiddleware, roleMiddleware('company'), async (req, res) => {
  try {
    const { contestId } = req.params;

    const snapshots = await ProctorSnapshot.findAll({
      where: { contestId },
      include: [{ association: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['timestamp', 'DESC']]
    });

    const snapshotsWithUrls = await Promise.all(snapshots.map(async (snap) => {
      const getCmd = new GetObjectCommand({ Bucket: s3Bucket, Key: snap.s3Key });
      const signedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 900 });
      return {
        id: snap.id,
        candidate: snap.user,
        timestamp: snap.timestamp,
        faceCount: snap.faceCount,
        suspiciousActivity: snap.suspiciousActivity,
        rekognitionAlert: snap.rekognitionAlert,
        url: signedUrl
      };
    }));

    res.json(snapshotsWithUrls);
  } catch (error) {
    console.error('Fetch all snapshots error:', error);
    res.status(500).json({ message: 'Failed to fetch proctor snapshots' });
  }
});

// Company — get snapshots for one candidate in a contest
router.get('/contest/:contestId/candidate/:userId', authMiddleware, roleMiddleware('company'), async (req, res) => {
  try {
    const { contestId, userId } = req.params;

    const snapshots = await ProctorSnapshot.findAll({
      where: { contestId, userId },
      order: [['timestamp', 'ASC']]
    });

    const snapshotsWithUrls = await Promise.all(snapshots.map(async (snap) => {
      const getCmd = new GetObjectCommand({ Bucket: s3Bucket, Key: snap.s3Key });
      const signedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 900 });
      return {
        id: snap.id,
        timestamp: snap.timestamp,
        faceCount: snap.faceCount,
        suspiciousActivity: snap.suspiciousActivity,
        rekognitionAlert: snap.rekognitionAlert,
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
