// models/Meeting.js
// Governance / general meetings of the mutual.

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

    // Date + time of the meeting (start)
    date: {
      type: Date,
      required: true,
    },

    // Optional human-readable time string (e.g. "18:00–20:00")
    time: {
      type: String,
      trim: true,
    },

    // Agenda or topics to be covered
    agenda: {
      type: String,
      trim: true,
    },

    // User (Admin / Member) who scheduled / created this meeting
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Summary of decisions taken during the meeting
    decisionsSummary: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Meeting", meetingSchema);
