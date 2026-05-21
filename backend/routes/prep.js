const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const PrepContribution = require('../models/PrepContribution');
const PrepDoubt = require('../models/PrepDoubt');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const sequelize = require('../config/db');

// Multi-part form handler for resume uploads
const multer = require('multer');
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Google Gemini API setup
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 1. Submit a preparation experience contribution
router.post('/contribute', authMiddleware, async (req, res) => {
  try {
    const { companyName, companyType, tips, resources } = req.body;

    if (!companyName || !companyType || !tips || !resources) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['product', 'service', 'startup'].includes(companyType)) {
      return res.status(400).json({ message: 'Invalid company type category' });
    }

    // Clean and normalize company name (e.g. "google" -> "Google", "goldman sachs" -> "Goldman Sachs")
    const formattedCompanyName = companyName
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const contribution = await PrepContribution.create({
      userId: req.user.id,
      companyName: formattedCompanyName,
      companyType,
      tips: tips.trim(),
      resources: resources.trim()
    });

    res.status(201).json({
      message: 'Interview preparation experience contributed successfully!',
      contribution
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 2. Fetch list of unique companies grouped by category
router.get('/companies', authMiddleware, async (req, res) => {
  try {
    const companies = await PrepContribution.findAll({
      attributes: [
        'companyName',
        'companyType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'contributionCount']
      ],
      group: ['companyName', 'companyType'],
      order: [['companyName', 'ASC']]
    });

    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 3. Get all contributions for a specific company name (case-insensitive query)
router.get('/company/:companyName', authMiddleware, async (req, res) => {
  try {
    const { companyName } = req.params;

    // Normalizing matching logic
    const formattedCompanyName = companyName
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const contributions = await PrepContribution.findAll({
      where: { companyName: formattedCompanyName },
      include: [
        {
          model: User,
          as: 'contributor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(contributions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 4. Get full details of a specific contribution and its Q&A doubts (nested replies format)
router.get('/contribution/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const contribution = await PrepContribution.findByPk(id, {
      include: [
        {
          model: User,
          as: 'contributor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!contribution) {
      return res.status(404).json({ message: 'Preparation card not found' });
    }

    // Fetch all doubts for this prep post
    const allDoubts = await PrepDoubt.findAll({
      where: { prepId: id },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Build the nested reply tree in JS
    const doubts = [];
    const replyMap = {};

    // Group doubts and replies
    allDoubts.forEach(doubt => {
      const doubtData = doubt.toJSON();
      doubtData.replies = [];

      if (!doubt.parentDoubtId) {
        doubts.push(doubtData);
        replyMap[doubt.id] = doubtData;
      } else {
        if (!replyMap[doubt.parentDoubtId]) {
          // Fallback if parent not registered yet (shouldn't happen with chronological order)
          replyMap[doubt.parentDoubtId] = { replies: [] };
        }
        replyMap[doubt.parentDoubtId].replies.push(doubtData);
      }
    });

    res.json({
      contribution,
      doubts
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 5. Submit a doubt or a reply to a doubt
router.post('/contribution/:id/doubt', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentDoubtId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    const contribution = await PrepContribution.findByPk(id);
    if (!contribution) {
      return res.status(404).json({ message: 'Preparation card not found' });
    }

    if (parentDoubtId) {
      const parentDoubt = await PrepDoubt.findByPk(parentDoubtId);
      if (!parentDoubt) {
        return res.status(404).json({ message: 'Parent doubt not found' });
      }
    }

    const doubt = await PrepDoubt.create({
      prepId: id,
      senderId: req.user.id,
      content: content.trim(),
      parentDoubtId: parentDoubtId || null
    });

    // Look up the sender's name from DB (JWT only has id + role)
    const senderUser = await User.findByPk(req.user.id, { attributes: ['name'] });
    const senderName = senderUser ? senderUser.name : 'Someone';

    // Create notification
    if (parentDoubtId) {
      // This is a reply to an existing doubt
      const parentDoubt = await PrepDoubt.findByPk(parentDoubtId);
      if (parentDoubt && parentDoubt.senderId !== req.user.id) {
        await notificationService.createNotification({
          userId: parentDoubt.senderId,
          type: 'reply_received',
          entityId: id,
          message: `${senderName} replied to your doubt.`
        });
      }
    } else {
      // New doubt on a contribution – notify the contribution owner
      if (contribution.userId !== req.user.id) {
        await notificationService.createNotification({
          userId: contribution.userId,
          type: 'doubt_received',
          entityId: id,
          message: `${senderName} asked a doubt on your contribution.`
        });
      }
    }

    const populatedDoubt = await PrepDoubt.findByPk(doubt.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Doubt/Reply posted successfully!',
      doubt: populatedDoubt
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 6. Candidate Resume Scanner & Job Match Optimizer (using Google Gemini 1.5 Flash)
router.post('/resume-scan', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const { jobDescription, targetRole } = req.body;
    const file = req.file;

    if (!jobDescription || !targetRole) {
      return res.status(400).json({ message: 'Job description and target role are required' });
    }

    if (!file) {
      return res.status(400).json({ message: 'Resume PDF file is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key is missing in server environment variables.' });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prepare PDF data
    const pdfData = {
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    // Prompt instructing the model to act as an ATS and return structured JSON
    const prompt = `
You are a world-class Applicant Tracking System (ATS) and expert SDE Recruiter.
Analyze the attached Resume PDF against the Target Job Role: "${targetRole}" and the Job Description provided below.

Job Description:
"""
${jobDescription}
"""

Evaluate the resume dynamically. Your output must be a single, valid JSON object with EXACTLY the following keys. Do NOT include markdown code blocks (e.g. \`\`\`json or \`\`\`), just return raw JSON text.

JSON Structure:
{
  "matchScore": <integer between 0 and 100 representing how well the resume matches the JD and target role>,
  "matchedSkills": [<array of technology/process skills found in both the resume and JD or relevant to the role>],
  "missingSkills": [<array of key technologies/tools/skills specified in the JD or highly expected for a "${targetRole}" role that are missing from the resume>],
  "strengths": [<array of 3-4 specific, high-value accomplishments or strong skills highlighted in the resume>],
  "improvements": [<array of 3-4 constructive, specific areas where the resume is weak, lacks metrics, or misses critical requirements>],
  "actionItems": [<array of 3-4 clear, actionable checkbox items (e.g., "Add Docker to your skills section", "Quantify the scale of your database migration in the Google experience")>],
  "bulletPointSuggestions": [
    {
      "original": "<a representative weak or basic bullet point from the resume>",
      "suggested": "<an optimized, high-impact rewrite of that bullet point following the STAR method with a quantified placeholder metric>",
      "reason": "<short explanation of why the rewrite is superior and what recruiters look for>"
    }
  ]
}
`;

    const result = await model.generateContent([pdfData, prompt]);
    const responseText = result.response.text().trim();

    // Clean up potential markdown formatting in response
    let jsonString = responseText;
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    }

    try {
      const evaluation = JSON.parse(jsonString);
      res.json(evaluation);
    } catch (parseErr) {
      console.error('Gemini response was not valid JSON:', responseText);
      res.status(500).json({
        message: 'Failed to parse AI response. Please try again.',
        error: parseErr.message,
        rawText: responseText
      });
    }

  } catch (err) {
    console.error('Error scanning resume:', err);
    if (err.status === 429 || err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({
        message: 'Gemini API Rate Limit or Daily Quota Exceeded. The Free Tier is limited to 15 requests per day, and large PDFs consume significant tokens. Please wait a minute before retrying, or verify your API key limits in Google AI Studio.',
        error: err.message
      });
    }
    res.status(500).json({ message: 'Server error during resume analysis', error: err.message });
  }
});

module.exports = router;
