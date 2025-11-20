import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // SYSTEM or user sender — optional
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    // Receiver — optional (system-wide or role-based)
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    // Optional: broadcast to roles
    roleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],

    // Method of delivery
    method: {
      type: String,
      enum: ["IN_APP", "EMAIL", "SMS", "PUSH_NOTIFICATION"],
      required: true,
    },

    // Notification type/category
    type: {
      type: String,
      enum: ["SYSTEM", "TRANSACTION", "SECURITY", "ACCOUNT", "REMINDER"],
      required: false,
      default: "SYSTEM",
    },

    // Who receives it
    scope: {
      type: String,
      enum: ["USER", "ALL_USERS", "ROLE"],
      required: false,
      default: "USER",
    },

    // Title + message body
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Link to details
    linkToData: {
      type: String,
      default: null,
    },

    // Mark as read
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Notification", notificationSchema);
