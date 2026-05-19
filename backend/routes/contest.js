const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Question = require('../models/Question');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Create a contest
router.post('/create', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;
    const contest = await Contest.create({
      title, description, startTime, endTime,
      createdBy: req.user.id
    });
    res.status(201).json({ message: 'Contest created successfully', contest });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all contests
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const whereClause = req.user.role === 'company'
      ? { createdBy: req.user.id }
      : {};
    const contests = await Contest.findAll({
      where: whereClause,
      include: [{ model: Question, as: 'questions', separate: true, order: [['id', 'ASC']] }],
      order: [['createdAt', 'DESC']]
    });

    // Filter out contests that ended more than 6 hours ago
    const now = new Date();
    const filteredContests = contests.filter(c => {
      const endTime = new Date(c.endTime);
      if (endTime < now) {
        const diffHours = (now - endTime) / (1000 * 60 * 60);
        return diffHours <= 6;
      }
      return true;
    });

    res.json({ contests: filteredContests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ MUST be before /:id — Add test case to a question
router.post('/questions/:questionId/testcases', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const TestCase = require('../models/TestCase');
    const question = await Question.findByPk(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const contest = await Contest.findByPk(question.contestId);
    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { input, expectedOutput, isHidden, marks } = req.body;
    const testCase = await TestCase.create({
      questionId: question.id,
      input,
      expectedOutput,
      isHidden: isHidden || false,
      marks: marks || 10
    });

    res.status(201).json({ message: 'Test case added!', testCase });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ MUST be before /:id — Get test cases for a question
router.get('/questions/:questionId/testcases', authMiddleware, async (req, res) => {
  try {
    const TestCase = require('../models/TestCase');
    const whereClause = req.user.role === 'candidate'
      ? { questionId: req.params.questionId, isHidden: false }
      : { questionId: req.params.questionId };

    const testCases = await TestCase.findAll({ where: whereClause });
    res.json({ testCases });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ MUST be before /:id — Delete a test case
router.delete('/testcases/:testCaseId', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const TestCase = require('../models/TestCase');
    const testCase = await TestCase.findByPk(req.params.testCaseId);

    if (!testCase) {
      return res.status(404).json({ message: 'Test case not found' });
    }

    const question = await Question.findByPk(testCase.questionId);
    const contest = await Contest.findByPk(question.contestId);
    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await testCase.destroy();
    res.json({ message: 'Test case deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single contest by id — /:id must come AFTER all specific routes
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions', separate: true, order: [['id', 'ASC']] }]
    });

    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ contest });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add question to a contest
router.post('/:id/questions', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, inputFormat, outputFormat, sampleInput, sampleOutput, difficulty, marks } = req.body;
    const question = await Question.create({
      contestId: contest.id,
      title, description, inputFormat, outputFormat,
      sampleInput, sampleOutput, difficulty, marks
    });

    res.status(201).json({ message: 'Question added successfully', question });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a contest — /:id must come AFTER specific routes
router.delete('/:id', authMiddleware, roleMiddleware('company', 'admin'), async (req, res) => {
  try {
    const contest = await Contest.findByPk(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (req.user.role === 'company' && contest.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await contest.destroy();
    res.json({ message: 'Contest deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const ContestRegistration = require('../models/ContestRegistration');

// Helper to generate heuristic question hints
const generateHeuristicHints = (question) => {
  const desc = (question.description || '').toLowerCase();
  const title = (question.title || '').toLowerCase();
  const fullText = `${title} ${desc}`;

  let conceptHint = 'Analyze the input and output constraints. Start by implementing a simple brute force solution, then see where duplicate calculations can be eliminated.';
  let edgeCases = '*   Empty list / empty string inputs\n*   Boundary cases like inputs containing 0, 1, or negative numbers\n*   Inputs that lead to very large numbers causing integer overflow';
  let algorithmTag = 'Simulation / Greedy';
  let algorithmDetails = 'Use a simple simulation of the problem logic. Alternatively, check if a greedy choice (locally optimal choice) leads to a globally optimal solution.';

  // Match Three-Sum, Triplets, sum of three
  if (
    fullText.includes('three sum') ||
    fullText.includes('threesum') ||
    fullText.includes('3sum') ||
    fullText.includes('triplet') ||
    fullText.includes('sum of three')
  ) {
    conceptHint = 'Brute-force checking all triplets takes O(N^3) time. We can optimize this to O(N^2) by sorting the array first, fixing one element, and using a Two-Pointer search for the remaining two elements.';
    edgeCases = '*   Array contains duplicate triplets (must skip identical values to return only unique triplets)\n*   Array has fewer than 3 elements (handle empty bounds)\n*   All elements are positive or all negative (no target sum possible)';
    algorithmTag = 'Two-Pointer Convergence / Sorting';
    algorithmDetails = '1. Sort the array first to handle duplicates and enable two-pointers.\n2. Iterate through the array with index `i`. If `i > 0` and the current number is the same as the previous one, skip it to avoid duplicate triplets.\n3. Place pointer `left` at `i + 1` and `right` at the end of the array.\n4. While `left < right`, compute the sum. If the sum is zero, add the triplet `[nums[i], nums[left], nums[right]]` to your result, then increment `left` and decrement `right` while skipping duplicate elements. If the sum is less than zero, increment `left`. If the sum is greater than zero, decrement `right`.';
  } else if (
    fullText.includes('two sum') ||
    fullText.includes('twosum') ||
    fullText.includes('pair') ||
    fullText.includes('two-pointer') ||
    fullText.includes('two pointer') ||
    fullText.includes('target sum') ||
    (fullText.includes('arr') && fullText.includes('target') && fullText.includes('index')) ||
    (fullText.includes('array') && fullText.includes('target') && fullText.includes('sum'))
  ) {
    conceptHint = 'You can optimize the naive O(N^2) brute force by trading memory for speed. Use a key-value store to look up precalculated values or complements in constant time O(1), or sort the array and use convergence pointers.';
    edgeCases = '*   Multiple valid pairs exist (ensure you return the correct matching indices)\n*   No duplicate or matching pair exists (gracefully handle null or empty bounds)\n*   Using the same index/element twice (e.g., target is 6, array has [3] - must NOT return [0, 0])';
    algorithmTag = 'Two-Pointer / HashMap Lookup';
    algorithmDetails = '1. HashMap Approach (Optimal - O(N) Time, O(N) Space):\n   Create a Hash Map. For each element `num` at index `i`, check if `target - num` already exists in the map. If yes, return `[map.get(target - num), i]`. Otherwise, insert `num` with value `i` into the map.\n\n2. Two-Pointer Approach (O(N log N) Time, O(1) Space):\n   Sort the array first. Place one pointer `left` at the beginning and `right` at the end. Check their sum. If `sum == target`, return. If `sum < target`, increment `left`. If `sum > target`, decrement `right`.';
  } else if (
    fullText.includes('shortest') ||
    fullText.includes('maze') ||
    fullText.includes('traverse') ||
    fullText.includes('graph') ||
    fullText.includes('tree') ||
    fullText.includes('path') ||
    fullText.includes('bfs') ||
    fullText.includes('dfs')
  ) {
    conceptHint = 'Represent this problem as a state graph. Each modification or move corresponds to a directed edge between nodes. Explore states level by level.';
    edgeCases = '*   Graph has multiple disconnected components\n*   Graph contains cycles (ensure you keep track of visited nodes to avoid infinite loops)\n*   Starting state is already the target state';
    algorithmTag = 'Breadth-First Search (BFS) / Depth-First Search (DFS)';
    algorithmDetails = 'Use BFS with a Queue if you want to find the shortest path in an unweighted graph. Use DFS with a Stack (or Recursion) for exhaustive path finding.';
  } else if (
    fullText.includes('subsequence') ||
    fullText.includes('subset') ||
    fullText.includes('knapsack') ||
    fullText.includes('partition') ||
    fullText.includes('maximum sum') ||
    fullText.includes('minimum steps') ||
    fullText.includes('fibonacci') ||
    fullText.includes('dp')
  ) {
    conceptHint = 'This problem can be broken down into overlapping subproblems. Try to define a state relation `dp[i]` representing the optimal choice up to index `i`.';
    edgeCases = '*   Input elements are negative\n*   No subset/partition is possible (handle failure boundaries)\n*   Large index values where simple recursion would time out (O(2^N))';
    algorithmTag = 'Dynamic Programming (DP)';
    algorithmDetails = 'Create a table (1D or 2D array) to store intermediate results, or use recursion with memoization (top-down) to optimize time complexity to O(N) or O(N*W).';
  } else if (
    fullText.includes('interval') ||
    fullText.includes('overlap') ||
    fullText.includes('meeting') ||
    fullText.includes('greedy') ||
    fullText.includes('schedule')
  ) {
    conceptHint = 'Consider sorting the inputs first. Often, sorting by start time or end time makes the optimal choice straightforward.';
    edgeCases = '*   Completely overlapping intervals (e.g., [1, 5] and [2, 3])\n*   Intervals with 0 duration (e.g., [2, 2])\n*   No overlaps exist';
    algorithmTag = 'Greedy / Sorting';
    algorithmDetails = 'Sort the intervals/elements by their end times. Iterate through them and greedily select the next non-overlapping element.';
  } else if (
    fullText.includes('duplicate') ||
    fullText.includes('frequency') ||
    fullText.includes('unique')
  ) {
    conceptHint = 'You can trade memory for speed. Use a key-value store to look up precalculated values or frequencies in constant time O(1).';
    edgeCases = '*   No duplicate or matching pair exists\n*   The same element cannot be reused (track index references)\n*   Large keys causing hash collisions';
    algorithmTag = 'HashMap / HashSet';
    algorithmDetails = 'Store the frequency or index of elements in a HashMap. Alternatively, sort the input array and use two pointers (left and right) moving toward each other.';
  }

  return {
    conceptHint,
    edgeCases,
    algorithmTag,
    algorithmDetails
  };
};

// Get AI Conceptual & Algorithm Hints
router.get('/question/:questionId/ai-hints', authMiddleware, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if the user is registered for the contest
    const registration = await ContestRegistration.findOne({
      where: { userId: req.user.id, contestId: question.contestId }
    });

    if (!registration) {
      return res.status(403).json({ message: 'You must be registered for this contest to view hints' });
    }

    // Check if they unlocked the algorithm hint
    let hasUnlockedAlg = false;
    if (registration.unlockedAlgorithms) {
      const unlocked = registration.unlockedAlgorithms.split(',').map(id => id.trim());
      hasUnlockedAlg = unlocked.includes(String(question.id));
    }

    let hints = null;

    // Use Gemini API if configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an AI coding tutor for CodeStorm.
Provide ultra-concise, brief, and short hints for the following programming question:
Title: ${question.title}
Description: ${question.description}
Difficulty: ${question.difficulty}

Requirements:
- Keep all fields extremely short, direct, and straight-to-the-point (avoid long explanations or paragraphs).
- "conceptHint": Max 2 short sentences giving a high-level conceptual clue.
- "edgeCases": Exactly 3 very brief bullet points (each bullet max 10 words).
- "algorithmTag": Short category name (e.g., "Two-Pointer / Sorting").
- "algorithmDetails": Exactly 1 short sentence stating the core algorithm to use (e.g., "Use Dynamic Programming to memoize overlapping subproblems.", "Use Dijkstra's algorithm for shortest paths."). Do NOT provide step-by-step implementation details.

Return the response strictly as a JSON object with this exact format:
{
  "conceptHint": "...",
  "edgeCases": "...",
  "algorithmTag": "...",
  "algorithmDetails": "..."
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          hints = JSON.parse(match[0]);
        } else {
          hints = JSON.parse(text);
        }
      } catch (geminiErr) {
        console.error('❌ Gemini hints failed, using local fallback:', geminiErr.message);
        hints = generateHeuristicHints(question);
      }
    } else {
      hints = generateHeuristicHints(question);
    }

    // Build the secure response: Hide algorithm details if not unlocked!
    const responsePayload = {
      conceptHint: hints.conceptHint,
      edgeCases: hints.edgeCases,
      isAlgorithmUnlocked: hasUnlockedAlg
    };

    if (hasUnlockedAlg) {
      responsePayload.algorithmTag = hints.algorithmTag;
      responsePayload.algorithmDetails = hints.algorithmDetails;
    } else {
      responsePayload.algorithmTag = '🔒 LOCKED (Unlocking will deduct 25% of this question\'s marks)';
      responsePayload.algorithmDetails = '🔒 Locked. Click "Reveal Strategy" below to unlock.';
    }

    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;