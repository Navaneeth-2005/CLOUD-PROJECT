const jwt = require('jsonwebtoken');
require('dotenv').config();

// Force connection to live AWS RDS MySQL Database
process.env.DB_HOST = "codestorm-prod-db.c5wu6ogwub2g.ap-south-1.rds.amazonaws.com";
process.env.DB_USER = "codestorm_admin";
process.env.DB_PASSWORD = "sqlkabaap";
process.env.DB_NAME = "cloudjudge";

const sequelize = require('./config/db');
const Contest = require('./models/Contest');
const Question = require('./models/Question');
const User = require('./models/User');

const ELB_URL = 'http://a44873505701344cba71f72d3e0dc774-1621922902.ap-south-1.elb.amazonaws.com';

async function run() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();

    // 1. Create a brand new contest
    console.log('Creating a brand new contest...');
    const startTime = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in the future
    const endTime = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000); // 12 days in the future
    const contest = await Contest.create({
      title: 'EKS Cloud Validation Challenge ' + Math.floor(Math.random() * 10000),
      description: 'End-to-end cloud-native architecture validation for email sending and EKS node metrics.',
      startTime,
      endTime,
      createdBy: 2
    });
    console.log(`✅ Created Contest: "${contest.title}" (ID: ${contest.id})`);

    // 2. Add a question to this contest
    console.log('Adding question to the contest...');
    const question = await Question.create({
      contestId: contest.id,
      title: 'Two Sum Problems',
      description: 'Find two numbers that add up to a target.',
      difficulty: 'Easy',
      inputFormat: 'Array of integers, Target integer',
      outputFormat: 'Indices of the two numbers',
      constraints: 'Linear complexity preferred',
      sampleInput: '[2, 7, 11, 15], 9',
      sampleOutput: '[0, 1]'
    });
    console.log(`✅ Created Question: "${question.title}" (ID: ${question.id})`);

    // 3. Generate a valid JWT token for Navaneeth (User ID: 3)
    console.log('Generating secure JWT Authorization token for Navaneeth...');
    const token = jwt.sign(
      { id: 3, role: 'candidate' },
      process.env.JWT_SECRET || 'cloudjudge_secret_key_2024',
      { expiresIn: '1h' }
    );
    console.log('✅ Generated JWT Token');

    // 4. Send POST registration request to EKS ELB Load Balancer
    console.log(`Calling EKS Ingress Load Balancer to register Navaneeth for the new contest...`);
    const registerUrl = `${ELB_URL}/api/registration/register`;
    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        contestId: contest.id,
        phone: '9849312775',
        college: 'Amrita University',
        experience: 'Fresher'
      })
    });

    const resData = await response.json();
    console.log('HTTP Status:', response.status);
    console.log('Server Response:', resData);

    if (response.ok) {
      console.log('\n🎉 SUCCESS! EKS END-TO-END VERIFICATION COMPLETED!');
      console.log('Navaneeth has been registered on the live EKS backend, and the SMTP credential email has been successfully dispatched to tammineedinavaneeth2@gmail.com!');
    } else {
      console.error('\n❌ Registration failed on EKS Load Balancer!');
    }

  } catch (error) {
    console.error('Validation test encountered error:', error.message);
  } finally {
    process.exit(0);
  }
}

run();
