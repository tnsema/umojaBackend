// schema/MeetingAttendance.js
// Tracks which member attended which meeting.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const meetingAttendanceSchema = new Schema(
  {
    // Meeting this attendance record belongs to
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },

    // Member (User) whose attendance is being recorded
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Whether this member attended the meeting
    attended: {
      type: Boolean,
      default: false,
    },

    // Evidence file (screenshot, sign-in sheet, etc.) – optional
    evidenceDocId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Each member should have at most one attendance record per meeting
meetingAttendanceSchema.index({ meetingId: 1, memberId: 1 }, { unique: true });

export default model("MeetingAttendance", meetingAttendanceSchema);
