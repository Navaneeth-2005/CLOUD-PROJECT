require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const sqsRegion = process.env.AWS_REGION || 'ap-south-1';
const sqsClient = new SQSClient({ region: sqsRegion });
const s3Client = new S3Client({ region: sqsRegion });
const queueUrl = process.env.SQS_QUEUE_URL;

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'cloudjudge',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'password123',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false
  }
);

// Submission model
const Submission = sequelize.define('Submission', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  userId: DataTypes.INTEGER,
  contestId: DataTypes.INTEGER,
  questionId: DataTypes.INTEGER,
  language: DataTypes.STRING,
  code: DataTypes.TEXT,
  status: DataTypes.STRING,
  score: DataTypes.INTEGER,
  executionTime: DataTypes.FLOAT,
  errorMessage: DataTypes.TEXT,
  testCasesPassed: DataTypes.INTEGER,
  totalTestCases: DataTypes.INTEGER
}, { timestamps: true });

// Question model
const Question = sequelize.define('Question', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  sampleInput: DataTypes.TEXT,
  sampleOutput: DataTypes.TEXT,
  marks: DataTypes.INTEGER
}, { timestamps: true });

// TestCase model
const TestCase = sequelize.define('TestCase', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  questionId: DataTypes.INTEGER,
  input: DataTypes.TEXT,
  expectedOutput: DataTypes.TEXT,
  isHidden: DataTypes.BOOLEAN,
  marks: DataTypes.INTEGER
}, { timestamps: true });

// ContestRegistration model
const ContestRegistration = sequelize.define('ContestRegistration', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: DataTypes.INTEGER,
  contestId: DataTypes.INTEGER,
  unlockedAlgorithms: DataTypes.TEXT
}, { timestamps: true });

// Language config
const languageConfig = {
  python: {
    filename: 'solution.py'
  },
  java: {
    filename: 'Solution.java'
  },
  'c++': {
    filename: 'solution.cpp'
  }
};

// Execute code using direct child_process.exec
const executeCode = (language, code, input) => {
  return new Promise((resolve) => {
    const config = languageConfig[language];
    if (!config) {
      return resolve({ success: false, output: '', error: 'Unsupported language', time: 0 });
    }

    const uniqueId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    const tmpDir = `/tmp/${uniqueId}`;
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      const codeFile = path.join(tmpDir, config.filename);
      const inputFile = path.join(tmpDir, 'input.txt');

      fs.writeFileSync(codeFile, code, 'utf8');
      fs.writeFileSync(inputFile, (input && input.trim()) ? input : '\n', 'utf8');

      // Adjust run command to work from tmpDir natively
      let runCmd = '';
      if (language === 'python') runCmd = `python3 ${codeFile} < ${inputFile}`;
      else if (language === 'java') runCmd = `cd ${tmpDir} && javac ${config.filename} && java Solution < input.txt`;
      else if (language === 'c++') runCmd = `cd ${tmpDir} && g++ -o solution ${config.filename} && ./solution < input.txt`;

      console.log(`  ▶️  Running natively: ${runCmd}`);

      exec(runCmd, { timeout: 15000 }, (runErr, stdout, stderr) => {
        const executionTime = Date.now() - startTime;

        // Cleanup temp files
        exec(`rm -rf ${tmpDir}`, () => { });

        if (runErr) {
          if (runErr.killed) {
            return resolve({
              success: false, output: '', error: 'Time Limit Exceeded (15s)', time: executionTime
            });
          }
          return resolve({
            success: false, output: '', error: (stderr || runErr.message || 'Unknown error').trim(), time: executionTime
          });
        }

        if (!stdout || stdout.trim() === '') {
          return resolve({
            success: false, output: '', error: 'No output produced', time: executionTime
          });
        }

        resolve({ success: true, output: stdout.trim(), error: '', time: executionTime });
      });

    } catch (err) {
      exec(`rm -rf ${tmpDir}`, () => { });
      return resolve({
        success: false, output: '', error: `Failed to setup execution: ${err.message}`, time: 0
      });
    }
  });
};

// Normalize output for comparison
const checkOutput = (actual, expected) => {
  const normalize = (str) =>
    str.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
  return normalize(actual) === normalize(expected);
};

// Process a single submission
const processSubmission = async (submissionId, overrideCode = null) => {
  console.log(`\n⚙️  Processing submission ${submissionId}...`);

  try {
    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      console.error(`❌ Submission ${submissionId} not found`);
      return;
    }

    await submission.update({ status: 'running' });

    const question = await Question.findByPk(submission.questionId);
    if (!question) {
      await submission.update({
        status: 'error',
        errorMessage: 'Question not found'
      });
      return;
    }

    // Get test cases from TestCase table first
    let testCases = await TestCase.findAll({
      where: { questionId: submission.questionId },
      order: [['id', 'ASC']]
    });

    // Fallback to sample input/output if no test cases added yet
    if (testCases.length === 0) {
      console.log('  ⚠️  No test cases in DB, using sample input/output as fallback');
      if (question.sampleInput && question.sampleOutput) {
        testCases = [{
          input: question.sampleInput,
          expectedOutput: question.sampleOutput,
          marks: question.marks
        }];
      } else {
        await submission.update({
          status: 'error',
          errorMessage: 'No test cases found. Please add test cases to this question.'
        });
        return;
      }
    }

    console.log(`  📋 Running against ${testCases.length} test case(s)...`);

    let passed = 0;
    let firstError = '';
    let totalTime = 0;
    let totalMarks = 0;
    let earnedMarks = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const tcMarks = testCase.marks || Math.floor(question.marks / testCases.length);
      totalMarks += tcMarks;

      console.log(`  Running test case ${i + 1}/${testCases.length}...`);

      const result = await executeCode(
        submission.language,
        overrideCode || submission.code,
        testCase.input
      );

      totalTime += result.time;

      if (!result.success) {
        if (!firstError) firstError = result.error;
        console.log(`  ❌ Execution error: ${result.error}`);

        // Stop on critical errors
        if (
          result.error.includes('Time Limit') ||
          result.error.includes('No output') ||
          result.error.includes('error:') ||
          result.error.includes('Exception') ||
          result.error.includes('Error:')
        ) {
          console.log('  ⏹ Stopping further test cases due to critical error');
          break;
        }
        continue;
      }

      const expectedOutput = testCase.expectedOutput || testCase.expected;

      if (checkOutput(result.output, expectedOutput)) {
        passed++;
        earnedMarks += tcMarks;
        console.log(`  ✅ Test case ${i + 1} passed (${result.time}ms)`);
      } else {
        console.log(`  ❌ Test case ${i + 1} failed`);
        console.log(`     Expected: "${expectedOutput}"`);
        console.log(`     Got:      "${result.output}"`);
      }
    }

    const totalTests = testCases.length;

    const baseScore = earnedMarks > 0
      ? earnedMarks
      : passed === totalTests
        ? question.marks
        : Math.floor((passed / totalTests) * question.marks);

    // 25% score deduction if AI Algorithm Hint was unlocked
    let score = baseScore;
    try {
      const reg = await ContestRegistration.findOne({
        where: { userId: submission.userId, contestId: submission.contestId }
      });
      if (reg && reg.unlockedAlgorithms) {
        const unlockedList = reg.unlockedAlgorithms.split(',').map(id => id.trim());
        if (unlockedList.includes(String(submission.questionId))) {
          score = Math.floor(baseScore * 0.75);
          console.log(`  💡 25% AI Hint deduction applied for user ${submission.userId} on question ${submission.questionId}. Score: ${baseScore} -> ${score}`);
        }
      }
    } catch (regErr) {
      console.error('  ❌ Error checking hint unlock deduction:', regErr.message);
    }

    const finalStatus = passed === totalTests ? 'accepted' : 'rejected';

    await submission.update({
      status: finalStatus,
      score,
      testCasesPassed: passed,
      totalTestCases: totalTests,
      executionTime: totalTime > 0 ? Math.round(totalTime / totalTests) : 0,
      errorMessage: firstError || null
    });

    console.log(`✅ Done! Submission ${submissionId} → ${finalStatus} (${passed}/${totalTests} tests, ${score} pts)`);

  } catch (err) {
    console.error(`❌ Error processing submission ${submissionId}:`, err.message);
    try {
      await Submission.update(
        { status: 'error', errorMessage: err.message },
        { where: { id: submissionId } }
      );
    } catch (e) { }
  }
};

// Poll for pending submissions
const pollForSubmissions = async () => {
  if (!queueUrl) {
    // Fallback to DB polling if SQS is not configured
    try {
      const pending = await Submission.findAll({
        where: { status: 'pending' },
        limit: 5,
        order: [['createdAt', 'ASC']]
      });

      if (pending.length > 0) {
        console.log(`📋 Found ${pending.length} pending submission(s) (DB Poll)`);
        for (const submission of pending) {
          await processSubmission(submission.id);
        }
      }
    } catch (err) {
      console.error('❌ DB Poll error:', err.message);
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
    return;
  }

  // SQS Long Polling
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 20 // Long polling
    });

    const response = await sqsClient.send(command);
    if (response.Messages && response.Messages.length > 0) {
      console.log(`📋 Received ${response.Messages.length} submission(s) from SQS`);
      for (const message of response.Messages) {
        try {
          const body = JSON.parse(message.Body);
          if (body.submissionId) {
            let executionCode = null;
            if (body.s3Key && process.env.S3_BUCKET_NAME) {
              try {
                const getCmd = new GetObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: body.s3Key
                });
                const { Body } = await s3Client.send(getCmd);
                executionCode = await Body.transformToString();
                console.log(`☁️ Fetched code from S3: ${body.s3Key}`);
              } catch (s3Err) {
                console.error('❌ Failed to fetch from S3:', s3Err.message);
              }
            }
            await processSubmission(body.submissionId, executionCode);
          }
          // Delete message after processing
          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle
          }));
        } catch (msgErr) {
          console.error('❌ Error processing SQS message:', msgErr.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ SQS Receive error:', err.message);
    console.log('🔄 SQS failed. Falling back to DB Poll to process pending submissions...');
    try {
      const pending = await Submission.findAll({
        where: { status: 'pending' },
        limit: 5,
        order: [['createdAt', 'ASC']]
      });

      if (pending.length > 0) {
        console.log(`📋 Found ${pending.length} pending submission(s) (DB Poll Fallback)`);
        for (const submission of pending) {
          await processSubmission(submission.id);
        }
      }
    } catch (dbErr) {
      console.error('❌ DB Poll fallback error:', dbErr.message);
    }
    await new Promise(resolve => setTimeout(resolve, 3000)); // Delay on error
  }
};

// Start worker
const startWorker = async () => {
  console.log('🚀 CodeStorm Worker starting...');
  console.log(`📡 Connecting to database at ${process.env.DB_HOST}...`);

  let retries = 10;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connected!');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Database not ready, retrying... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (retries === 0) {
    console.error('❌ Could not connect to database. Exiting.');
    process.exit(1);
  }

  console.log('⚙️  Worker polling for submissions...');
  while (true) {
    await pollForSubmissions();
  }
};

startWorker();