// schema/Meeting.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const meetingSchema = new Schema(
  {
    // Title or name of the meeting
    title: {
      type: String,
      required: true,
      trim: true,
    },

    agenda: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // Date of the meeting (e.g. 2026-01-10T00:00:00.000Z)
    // You can store full datetime here if you want
    date: {
      type: Date,
      required: true,
    },

    // Optional start time as "HH:mm" (string)
    startTime: {
      type: String,
      trim: true,
    },

    // Optional end time as "HH:mm" (string)
    endTime: {
      type: String,
      trim: true,
    },

    // Year of the meeting (for easier filtering / attendance calculations)
    year: {
      type: Number,
      required: true,
      index: true,
    },

    // User (Admin / Member) who scheduled / created this meeting
    chairId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Summary of decisions taken during the meeting
    decisionsSummary: {
      type: String,
      trim: true,
    },

    // Optional link to meeting minutes document (e.g. URL or file path)
    minutesLink: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Meeting", meetingSchema);
