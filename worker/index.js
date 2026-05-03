require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

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

// Language config
const languageConfig = {
  python: {
    image: 'python:3.11-alpine',
    filename: 'solution.py',
    runCmd: 'python /code/solution.py'
  },
  java: {
    image: 'eclipse-temurin:17-jdk',
    filename: 'Solution.java',
    runCmd: 'javac /code/Solution.java && java -cp /code Solution'
  },
  'c++': {
    image: 'gcc:latest',
    filename: 'solution.cpp',
    runCmd: 'g++ -o /code/solution /code/solution.cpp && /code/solution'
  }
};

// Pre-pull Docker images so first execution does not timeout
const pullImages = async () => {
  console.log('📦 Pulling Docker images...');
  const images = [
    'python:3.11-alpine',
    'eclipse-temurin:17-jdk',
    'gcc:latest'
  ];
  for (const image of images) {
    await new Promise((resolve) => {
      exec(`docker pull ${image}`, (err, stdout, stderr) => {
        if (err) {
          console.log(`⚠️  Could not pull ${image}: ${err.message}`);
        } else {
          console.log(`✅ Pulled ${image}`);
        }
        resolve();
      });
    });
  }
};

// Execute code using docker cp approach — no volume mounts
const executeCode = (language, code, input) => {
  return new Promise((resolve) => {
    const config = languageConfig[language];
    if (!config) {
      return resolve({ success: false, output: '', error: 'Unsupported language', time: 0 });
    }

    const uniqueId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const containerName = `runner_${uniqueId}`;
    const startTime = Date.now();

    // Step 1 — Start a long-lived container
    const startCmd = [
      'docker run -d',
      `--name ${containerName}`,
      '--memory="128m"',
      '--cpus="0.5"',
      '--network none',
      '--ulimit nproc=50',
      '--ulimit fsize=1000000',
      config.image,
      'sh -c "sleep 60"'
    ].join(' ');

    console.log(`  🐳 Starting container: ${containerName}`);

    exec(startCmd, (startErr) => {
      if (startErr) {
        return resolve({
          success: false,
          output: '',
          error: `Failed to start container: ${startErr.message}`,
          time: 0
        });
      }

      // Step 2 — Write code to a temp file and copy into container
      const tmpCodeFile = `/tmp/${uniqueId}_${config.filename}`;
      const tmpInputFile = `/tmp/${uniqueId}_input.txt`;

      try {
        fs.writeFileSync(tmpCodeFile, code, 'utf8');
        fs.writeFileSync(tmpInputFile, (input && input.trim()) ? input : '\n', 'utf8');
      } catch (writeErr) {
        exec(`docker rm -f ${containerName}`, () => {});
        return resolve({
          success: false,
          output: '',
          error: `Failed to write temp files: ${writeErr.message}`,
          time: 0
        });
      }

      console.log(`  📄 Code file size: ${fs.statSync(tmpCodeFile).size} bytes`);

      // Create /code directory and copy files into container
      exec(`docker exec ${containerName} mkdir -p /code`, (mkdirErr) => {
        if (mkdirErr) {
          exec(`docker rm -f ${containerName}`, () => {});
          try { fs.unlinkSync(tmpCodeFile); fs.unlinkSync(tmpInputFile); } catch (e) {}
          return resolve({
            success: false, output: '',
            error: `Failed to create /code dir: ${mkdirErr.message}`,
            time: 0
          });
        }

        // Copy code file
        exec(`docker cp ${tmpCodeFile} ${containerName}:/code/${config.filename}`, (cpCodeErr) => {
          if (cpCodeErr) {
            exec(`docker rm -f ${containerName}`, () => {});
            try { fs.unlinkSync(tmpCodeFile); fs.unlinkSync(tmpInputFile); } catch (e) {}
            return resolve({
              success: false, output: '',
              error: `Failed to copy code: ${cpCodeErr.message}`,
              time: 0
            });
          }

          // Copy input file
          exec(`docker cp ${tmpInputFile} ${containerName}:/code/input.txt`, (cpInputErr) => {
            // Cleanup temp files
            try { fs.unlinkSync(tmpCodeFile); fs.unlinkSync(tmpInputFile); } catch (e) {}

            if (cpInputErr) {
              exec(`docker rm -f ${containerName}`, () => {});
              return resolve({
                success: false, output: '',
                error: `Failed to copy input: ${cpInputErr.message}`,
                time: 0
              });
            }

            console.log(`  ✅ Files copied into container`);

            // Step 3 — Run the code with input
            const runCmd = `docker exec ${containerName} sh -c "${config.runCmd} < /code/input.txt"`;
            console.log(`  ▶️  Running: ${config.runCmd}`);

            exec(runCmd, { timeout: 15000 }, (runErr, stdout, stderr) => {
              const executionTime = Date.now() - startTime;

              // Always cleanup container
              exec(`docker rm -f ${containerName}`, () => {
                console.log(`  🗑️  Container ${containerName} removed`);
              });

              if (runErr) {
                if (runErr.killed) {
                  return resolve({
                    success: false,
                    output: '',
                    error: 'Time Limit Exceeded (15s) — Make sure your program reads input and produces output.',
                    time: executionTime
                  });
                }
                const errMsg = (stderr || runErr.message || 'Unknown error').trim();
                return resolve({
                  success: false,
                  output: '',
                  error: errMsg,
                  time: executionTime
                });
              }

              if (!stdout || stdout.trim() === '') {
                return resolve({
                  success: false,
                  output: '',
                  error: 'No output produced — Make sure your program prints the answer using print() / System.out.println() / cout',
                  time: executionTime
                });
              }

              console.log(`  📤 Output: "${stdout.trim()}"`);
              resolve({
                success: true,
                output: stdout.trim(),
                error: '',
                time: executionTime
              });
            });
          });
        });
      });
    });
  });
};

// Normalize output for comparison
const checkOutput = (actual, expected) => {
  const normalize = (str) =>
    str.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
  return normalize(actual) === normalize(expected);
};

// Process a single submission
const processSubmission = async (submissionId) => {
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
        submission.code,
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

    const score = earnedMarks > 0
      ? earnedMarks
      : passed === totalTests
      ? question.marks
      : Math.floor((passed / totalTests) * question.marks);

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
    } catch (e) {}
  }
};

// Poll for pending submissions
const pollForSubmissions = async () => {
  try {
    const pending = await Submission.findAll({
      where: { status: 'pending' },
      limit: 5,
      order: [['createdAt', 'ASC']]
    });

    if (pending.length > 0) {
      console.log(`📋 Found ${pending.length} pending submission(s)`);
      for (const submission of pending) {
        await processSubmission(submission.id);
      }
    }
  } catch (err) {
    console.error('❌ Poll error:', err.message);
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

  await pullImages();

  console.log('⚙️  Worker polling for submissions every 3 seconds...');
  setInterval(pollForSubmissions, 3000);
  await pollForSubmissions();
};

startWorker();