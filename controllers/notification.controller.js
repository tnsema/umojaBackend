// controllers/notification.controller.js

// controllers/notification.controller.js

import {
  createNotificationService,
  getNotificationByIdService,
  listUserNotificationsService,
  listAllNotificationsService,
  markNotificationReadService,
  deleteNotificationService,
} from "../services/notification.service.js";

/**
 * POST /notifications
 * Body (form-data):
 *  - userId      (receiver)
 *  - type        (SYSTEM | TRANSACTION | SECURITY | ACCOUNT | REMINDER)
 *  - method      (IN_APP | EMAIL | SMS | PUSH_NOTIFICATION)
 *  - title
 *  - message
 *  - linkToData  (optional)
 *  - senderId    (optional; if omitted, receiver will be used as sender)
 *
 * Usually called by ADMIN or system processes.
 */
export async function createNotification(req, res) {
  try {
    const { userId, type, method, title, message, linkToData, senderId } =
      req.body || {};

    const notif = await createNotificationService({
      userId,
      type,
      method,
      title,
      message,
      linkToData,
      senderId,
    });

    return res.status(201).json({
      status: true,
      message: "Notification created successfully",
      data: notif,
    });
  } catch (err) {
    console.error("Error in createNotification:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId, type, method, title and message are required",
      });
    }

    if (err.code === "INVALID_METHOD") {
      return res.status(400).json({
        status: false,
        field: "method",
        message: "Invalid notification method",
      });
    }

    if (err.code === "INVALID_TYPE") {
      return res.status(400).json({
        status: false,
        field: "type",
        message: "Invalid notification type",
      });
    }

    if (err.code === "RECEIVER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Receiver not found",
      });
    }

    if (err.code === "SENDER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Sender not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating notification",
    });
  }
}

/**
 * GET /notifications/:id
 * Auth: jwtVerify
 */
export async function getNotification(req, res) {
  try {
    const notif = await getNotificationByIdService(req.params.id);

    return res.status(200).json({
      status: true,
      data: notif,
    });
  } catch (err) {
    console.error("Error in getNotification:", err);

    if (err.code === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error fetching notification",
    });
  }
}

/**
 * GET /notifications
 * Auth: jwtVerify
 * Logged-in user: list their notifications
 */
export async function listMyNotifications(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const list = await listUserNotificationsService(userId);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in listMyNotifications:", err);

    if (err.code === "USER_ID_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "UserId is required",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error fetching notifications",
    });
  }
}

/**
 * GET /notifications/all
 * Auth: jwtVerify + requireRole("ADMIN")
 * Admin: fetch all notifications
 */
export async function listAllNotifications(req, res) {
  try {
    const list = await listAllNotificationsService();

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in listAllNotifications:", err);

    return res.status(500).json({
      status: false,
      message: "Server error fetching all notifications",
    });
  }
}

/**
 * POST /notifications/:id/read
 * Auth: jwtVerify
 * User marks their own notification as read.
 */
export async function markNotificationRead(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const { id } = req.params;
    const notif = await markNotificationReadService(userId, id);

    return res.status(200).json({
      status: true,
      message: "Notification marked as read",
      data: notif,
    });
  } catch (err) {
    console.error("Error in markNotificationRead:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId and notificationId are required",
      });
    }

    if (err.code === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Notification not found or not owned by user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error marking notification as read",
    });
  }
}

/**
 * DELETE /notifications/:id
 * Auth: jwtVerify
 *
 * - Admin can delete any notification
 * - Normal user can only delete their own (receiver)
 */
export async function deleteNotification(req, res) {
  try {
    const userId = req.payload?.userId;
    const roles = req.payload?.roles || [];
    const isAdmin = roles.includes("ADMIN");

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const { id } = req.params;

    const result = await deleteNotificationService({
      userId,
      notificationId: id,
      isAdmin,
    });

    return res.status(200).json({
      status: true,
      message: "Notification deleted successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in deleteNotification:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId and notificationId are required",
      });
    }

    if (err.code === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    if (err.code === "FORBIDDEN") {
      return res.status(403).json({
        status: false,
        message: "You are not allowed to delete this notification",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error deleting notification",
    });
  }
}
