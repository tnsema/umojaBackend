// services/notification.service.js
// Business logic for notifications:
// - create (with method-specific helpers)
// - get by id
// - list per user
// - list all (admin)
// - mark read
// - delete

import Models from "../model/model.js";

const { notification: Notification, user: User } = Models;

// Allowed methods/types matching your schema
const ALLOWED_METHODS = ["IN_APP", "EMAIL", "SMS", "PUSH_NOTIFICATION"];
const ALLOWED_TYPES = [
  "SYSTEM",
  "TRANSACTION",
  "SECURITY",
  "ACCOUNT",
  "REMINDER",
];

/**
 * INTERNAL HELPERS
 * ----------------
 * Each method has its own creator. They all:
 *  - validate receiver exists
 *  - ensure sender exists (if provided)
 *  - create Notification document
 *
 * Later you can extend EMAIL/SMS/PUSH to actually send via providers.
 */

async function createInAppNotification({
  senderId,
  receiverId,
  type,
  title,
  message,
  linkToData,
}) {
  const notification = await Notification.create({
    sender: senderId,
    receiver: receiverId,
    method: "IN_APP",
    type,
    title,
    description: message,
    linkToData: linkToData || null,
  });

  return notification;
}

async function createEmailNotification({
  senderId,
  receiverId,
  type,
  title,
  message,
  linkToData,
}) {
  const notification = await Notification.create({
    sender: senderId,
    receiver: receiverId,
    method: "EMAIL",
    type,
    title,
    description: message,
    linkToData: linkToData || null,
  });

  // TODO: integrate with real email provider here
  // e.g., sendEmail(receiver.email, title, message, linkToData)

  return notification;
}

async function createSmsNotification({
  senderId,
  receiverId,
  type,
  title,
  message,
  linkToData,
}) {
  const notification = await Notification.create({
    sender: senderId,
    receiver: receiverId,
    method: "SMS",
    type,
    title,
    description: message,
    linkToData: linkToData || null,
  });

  // TODO: integrate with SMS gateway

  return notification;
}

async function createPushNotification({
  senderId,
  receiverId,
  type,
  title,
  message,
  linkToData,
}) {
  const notification = await Notification.create({
    sender: senderId,
    receiver: receiverId,
    method: "PUSH_NOTIFICATION",
    type,
    title,
    description: message,
    linkToData: linkToData || null,
  });

  // TODO: integrate with push service (Firebase, etc.)

  return notification;
}

/**
 * createNotification({ userId, type, method, title, message, senderId?, linkToData? })
 *
 * NOTE: userId = receiverId.
 * senderId is optional; if not provided, we default sender = receiver (or you can later set a SYSTEM user).
 */
export async function createNotificationService({
  userId,
  type,
  method,
  title,
  message,
  linkToData,
  senderId,
}) {
  if (!userId || !type || !method || !title || !message) {
    const err = new Error("Missing required fields");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const normalizedMethod = String(method).trim().toUpperCase();
  const normalizedType = String(type).trim().toUpperCase();

  if (!ALLOWED_METHODS.includes(normalizedMethod)) {
    const err = new Error("Invalid notification method");
    err.code = "INVALID_METHOD";
    throw err;
  }

  if (!ALLOWED_TYPES.includes(normalizedType)) {
    const err = new Error("Invalid notification type");
    err.code = "INVALID_TYPE";
    throw err;
  }

  // Receiver
  const receiverUser = await User.findById(userId);
  if (!receiverUser) {
    const err = new Error("Receiver not found");
    err.code = "RECEIVER_NOT_FOUND";
    throw err;
  }

  // Optional sender: if not provided, we default to same user (you can later change to SYSTEM user)
  let senderUser = null;
  if (senderId) {
    senderUser = await User.findById(senderId);
    if (!senderUser) {
      const err = new Error("Sender not found");
      err.code = "SENDER_NOT_FOUND";
      throw err;
    }
  }

  const effectiveSenderId = senderUser ? senderUser._id : receiverUser._id;

  const payload = {
    senderId: effectiveSenderId,
    receiverId: receiverUser._id,
    type: normalizedType,
    title: title.trim(),
    message: message.trim(),
    linkToData,
  };

  switch (normalizedMethod) {
    case "IN_APP":
      return createInAppNotification(payload);
    case "EMAIL":
      return createEmailNotification(payload);
    case "SMS":
      return createSmsNotification(payload);
    case "PUSH_NOTIFICATION":
      return createPushNotification(payload);
    default: {
      const err = new Error("Unsupported notification method");
      err.code = "INVALID_METHOD";
      throw err;
    }
  }
}

/**
 * getNotificationById(notificationId)
 */
export async function getNotificationByIdService(notificationId) {
  const notif = await Notification.findById(notificationId)
    .populate("sender receiver")
    .lean();

  if (!notif) {
    const err = new Error("Notification not found");
    err.code = "NOTIFICATION_NOT_FOUND";
    throw err;
  }

  return notif;
}

/**
 * listUserNotifications(userId)
 */
export async function listUserNotificationsService(userId) {
  if (!userId) {
    const err = new Error("UserId is required");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  return Notification.find({ receiver: userId }).sort({ createdAt: -1 }).lean();
}

/**
 * listAllNotifications()
 * Admin view
 */
export async function listAllNotificationsService() {
  return Notification.find()
    .populate("sender receiver")
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * markNotificationRead(userId, notificationId)
 */
export async function markNotificationReadService(userId, notificationId) {
  if (!userId || !notificationId) {
    const err = new Error("userId and notificationId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const notif = await Notification.findOne({
    _id: notificationId,
    receiver: userId,
  });

  if (!notif) {
    const err = new Error("Notification not found or not owned by user");
    err.code = "NOTIFICATION_NOT_FOUND";
    throw err;
  }

  notif.read = true;
  await notif.save();

  return notif;
}

/**
 * deleteNotification(userIdOrAdmin, notificationId)
 *
 * - Admin can delete anything (isAdmin flag handled in controller)
 * - Normal user can only delete their own notifications
 */
export async function deleteNotificationService({
  userId,
  notificationId,
  isAdmin,
}) {
  if (!userId || !notificationId) {
    const err = new Error("userId and notificationId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const notif = await Notification.findById(notificationId);
  if (!notif) {
    const err = new Error("Notification not found");
    err.code = "NOTIFICATION_NOT_FOUND";
    throw err;
  }

  if (!isAdmin && String(notif.receiver) !== String(userId)) {
    const err = new Error("Not allowed to delete this notification");
    err.code = "FORBIDDEN";
    throw err;
  }

  await Notification.deleteOne({ _id: notificationId });

  return { deleted: true };
}
