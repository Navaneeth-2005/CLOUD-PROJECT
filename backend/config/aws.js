const { SQSClient } = require('@aws-sdk/client-sqs');
const { S3Client } = require('@aws-sdk/client-s3');
const { SESClient } = require('@aws-sdk/client-ses');

const region = process.env.AWS_REGION || 'ap-south-1';

const sqsClient = new SQSClient({ region });
const s3Client = new S3Client({ region });
const sesClient = new SESClient({ region });

module.exports = {
  sqsClient,
  s3Client,
  sesClient
};
