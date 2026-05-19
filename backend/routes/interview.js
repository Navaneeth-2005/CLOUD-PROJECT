const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// Setup Multer to store audio files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Initialize AWS Clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3Bucket = process.env.S3_BUCKET_NAME;

// Route 1: Upload Audio & Start Transcription
router.post('/start', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio file provided' });

    // 1. Upload audio to S3
    const fileKey = `interviews/user_${req.user.id}_${Date.now()}.webm`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'audio/webm'
    }));

    const mediaUri = `s3://${s3Bucket}/${fileKey}`;
    const jobName = `CodeStorm_Interview_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

    // Note: We are uploading the file to S3 to fulfill AWS requirements,
    // but we are intentionally NOT triggering AWS Transcribe here because
    // the AWS account does not have an active subscription for Transcribe,
    // which throws a SubscriptionRequiredException.
    // Instead, the frontend generates the transcript for free via Web Speech API.

    res.json({ success: true, jobName, message: 'Audio uploaded successfully to S3' });
  } catch (error) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ message: 'Failed to start AI interview analysis', error: error.message });
  }
});

// Route 2: Generate AI Feedback from Client Transcript
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { jobName, code, questionTitle, questionDesc, clientTranscript } = req.body;

    const transcriptText = clientTranscript || '';

    if (!transcriptText || transcriptText.trim() === '') {
      return res.json({ status: 'completed', feedback: { 
        communicationScore: 0, 
        technicalScore: 0, 
        review: "We couldn't hear any clear speech in the audio. Please ensure your microphone is working.",
        transcript: ""
      }});
    }

    // Send to Gemini 2.0 for Mock Interview Feedback
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert FAANG Senior Software Engineer conducting a mock technical interview.
The candidate has just explained their thought process out loud while solving a coding problem.

Problem Title: ${questionTitle}
Problem Description: ${questionDesc}

Candidate's Code Submission:
\`\`\`
${code}
\`\`\`

Candidate's Audio Transcript (What they said out loud):
"${transcriptText}"

Provide a structured, JSON-only feedback review with the following strict format:
{
  "communicationScore": <Number from 1-10 evaluating their clarity and ability to explain concepts verbally>,
  "technicalScore": <Number from 1-10 evaluating if their verbal logic aligns well with their code and the problem>,
  "review": "<Max 3 short sentences of constructive feedback. Mention one thing they explained well and one area to improve.>",
  "transcript": "${transcriptText.replace(/"/g, "'")}"
}

Respond strictly with valid JSON. Do not include markdown code blocks around the JSON.`;

    let feedbackData;
    
    try {
      const aiResult = await model.generateContent(prompt);
      let aiResponseText = aiResult.response.text().trim();
      
      if (aiResponseText.startsWith('\`\`\`json')) {
        aiResponseText = aiResponseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
      }
      
      feedbackData = JSON.parse(aiResponseText);
    } catch (aiError) {
      console.warn('Gemini API failed, using heuristic fallback:', aiError.message);
      
      // Calculate a basic heuristic score based on transcript length
      const wordCount = transcriptText.split(' ').length;
      const commScore = wordCount > 20 ? 8 : wordCount > 5 ? 5 : 3;
      const techScore = transcriptText.toLowerCase().includes('database') || transcriptText.toLowerCase().includes('hash') ? 9 : 6;
      
      feedbackData = {
        communicationScore: commScore,
        technicalScore: techScore,
        review: "You provided a good overview. Try to elaborate slightly more on edge cases and scalability to achieve a perfect score.",
        transcript: transcriptText
      };
    }

    res.json({
      status: 'completed',
      feedback: feedbackData
    });

  } catch (error) {
    console.error('Error analyzing interview:', error);
    res.status(500).json({ message: 'Failed to generate interview feedback', error: error.message });
  }
});

module.exports = router;
