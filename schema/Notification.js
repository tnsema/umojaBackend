import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional if scope is ALL_USERS or ROLE
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.scope === "USER";
      },
    },

    // Optional if scope is ROLE
    roleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],

    method: {
      type: String,
      enum: ["IN_APP", "EMAIL", "SMS", "PUSH_NOTIFICATION"],
      required: true,
    },

    // Category of notification
    category: {
      type: String,
      enum: ["SYSTEM", "TRANSACTION", "SECURITY", "ACCOUNT", "REMINDER"],
      required: true,
    },

    // Who should receive it
    scope: {
      type: String,
      enum: ["USER", "ALL_USERS", "ROLE"],
      required: true,
      default: "USER",
    },

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

    linkToData: {
      type: String,
      default: null,
    },

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
