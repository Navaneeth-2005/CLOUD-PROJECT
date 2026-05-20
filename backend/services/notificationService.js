// notificationService.js – wrapper around DynamoDB for managing notifications
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand, DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

// DynamoDB client – region will be inherited from environment (AWS_REGION)
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Create a notification entry and emit via WebSocket.
 * @param {Object} params
 * @param {string} params.userId - The user who should receive the notification.
 * @param {string} params.type - "doubt_received" or "reply_received".
 * @param {string} params.entityId - ID of the related PrepContribution or PrepDoubt.
 * @param {string} params.message - Human‑readable message.
 */
async function createNotification({ userId, type, entityId, message }) {
  const notificationId = uuidv4();
  const item = {
    userId: String(userId),
    notificationId,
    type,
    entityId,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  const putCmd = new PutCommand({ TableName: "Notifications", Item: item });
  await ddbDocClient.send(putCmd);

  // Emit event real-time if global.io is initialized
  if (global.io) {
    console.log(`📡 Emitting websocket notification to room user_${userId}`);
    global.io.to(`user_${userId}`).emit('notification', item);
  }

  return item;
}

/**
 * Fetch all notifications for a specific user.
 * @param {string} userId
 */
async function getNotifications(userId) {
  const queryCmd = new QueryCommand({
    TableName: "Notifications",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": String(userId)
    }
  });

  const response = await ddbDocClient.send(queryCmd);
  const items = response.Items || [];
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Mark a notification as read.
 * @param {string} userId
 * @param {string} notificationId
 */
async function markNotificationAsRead(userId, notificationId) {
  const updateCmd = new UpdateCommand({
    TableName: "Notifications",
    Key: {
      userId: String(userId),
      notificationId: String(notificationId)
    },
    UpdateExpression: "SET isRead = :isRead",
    ExpressionAttributeValues: {
      ":isRead": true
    },
    ReturnValues: "ALL_NEW"
  });

  const response = await ddbDocClient.send(updateCmd);
  return response.Attributes;
}

/**
 * Delete ALL notifications for a user (clear history).
 * DynamoDB BatchWrite supports max 25 items per batch.
 * @param {string} userId
 */
async function deleteAllNotifications(userId) {
  const items = await getNotifications(userId);
  if (items.length === 0) return;

  // BatchWriteItem supports max 25 requests per call
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  for (const batch of batches) {
    const deleteRequests = batch.map(item => ({
      DeleteRequest: {
        Key: {
          userId: String(userId),
          notificationId: item.notificationId
        }
      }
    }));

    const batchCmd = new BatchWriteCommand({
      RequestItems: {
        Notifications: deleteRequests
      }
    });
    await ddbDocClient.send(batchCmd);
  }
}

module.exports = {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  deleteAllNotifications
};
