import Models from "../model/model.js";

const { notification: Notification, user: User } = Models;

const ALLOWED_METHODS = ["IN_APP", "EMAIL", "SMS", "PUSH_NOTIFICATION"];
const ALLOWED_TYPES = [
  "SYSTEM",
  "TRANSACTION",
  "SECURITY",
  "ACCOUNT",
  "REMINDER",
];

async function createInAppNotification(payload) {
  return Notification.create({
    sender: payload.senderId || null,
    receiver: payload.receiverId || null,
    method: "IN_APP",
    type: payload.type,
    title: payload.title,
    description: payload.message,
    linkToData: payload.linkToData || null,
  });
}

async function createEmailNotification(payload) {
  return Notification.create({
    sender: payload.senderId || null,
    receiver: payload.receiverId || null,
    method: "EMAIL",
    type: payload.type,
    title: payload.title,
    description: payload.message,
    linkToData: payload.linkToData || null,
  });
}

async function createSmsNotification(payload) {
  return Notification.create({
    sender: payload.senderId || null,
    receiver: payload.receiverId || null,
    method: "SMS",
    type: payload.type,
    title: payload.title,
    description: payload.message,
    linkToData: payload.linkToData || null,
  });
}

async function createPushNotification(payload) {
  return Notification.create({
    sender: payload.senderId || null,
    receiver: payload.receiverId || null,
    method: "PUSH_NOTIFICATION",
    type: payload.type,
    title: payload.title,
    description: payload.message,
    linkToData: payload.linkToData || null,
  });
}

/**
 * CREATE Notification (receiver can be null)
 */
export async function createNotificationService({
  userId = null, // receiverId
  type,
  method,
  title,
  message,
  linkToData = null,
  senderId = null,
}) {
  if (!type || !method || !title || !message) {
    const err = new Error("Missing required fields");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const normalizedMethod = method.trim().toUpperCase();
  const normalizedType = type.trim().toUpperCase();

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

  // -------------------------------
  // Optional receiver
  // -------------------------------
  let receiverUser = null;
  if (userId) {
    receiverUser = await User.findById(userId);
    if (!receiverUser) {
      const err = new Error("Receiver not found");
      err.code = "RECEIVER_NOT_FOUND";
      throw err;
    }
  }

  // -------------------------------
  // Optional sender
  // -------------------------------
  let senderUser = null;
  if (senderId) {
    senderUser = await User.findById(senderId);
    if (!senderUser) {
      const err = new Error("Sender not found");
      err.code = "SENDER_NOT_FOUND";
      throw err;
    }
  }

  const payload = {
    senderId: senderUser?._id || null, // OK to be null
    receiverId: receiverUser?._id || null, // OK to be null
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
