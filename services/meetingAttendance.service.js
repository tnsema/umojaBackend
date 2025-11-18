// services/meetingAttendance.service.js
// Business logic for recording and listing meeting attendance.

import Models from "../model/model.js";
import mongoose from "mongoose";

const {
  meeting: Meeting,
  user: User,
  meetingAttendance: MeetingAttendance,
} = Models;

const { isValidObjectId } = mongoose;

/**
 * recordAttendance({ meetingId, memberId, attended, evidenceDocId?, recordedBy })
 *
 * NOTE:
 * - recordedBy is typically the logged-in user (admin / project manager)
 * - evidenceDocId is optional: could be a file key, URL, etc.
 * - upsert behaviour: if (meetingId, memberId) already exists, update it.
 */
export async function recordAttendanceService({
  meetingId,
  memberId,
  attended,
  evidenceDocId,
  recordedBy,
}) {
  if (
    !meetingId ||
    !memberId ||
    attended === undefined || // must be true/false
    !recordedBy
  ) {
    const err = new Error(
      "meetingId, memberId, attended and recordedBy are required"
    );
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (
    !isValidObjectId(meetingId) ||
    !isValidObjectId(memberId) ||
    !isValidObjectId(recordedBy)
  ) {
    const err = new Error("Invalid meetingId, memberId or recordedBy");
    err.code = "INVALID_ID";
    throw err;
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.code = "MEETING_NOT_FOUND";
    throw err;
  }

  const member = await User.findById(memberId);
  if (!member) {
    const err = new Error("Member not found");
    err.code = "MEMBER_NOT_FOUND";
    throw err;
  }

  const recorder = await User.findById(recordedBy);
  if (!recorder) {
    const err = new Error("Recorded-by user not found");
    err.code = "RECORDER_NOT_FOUND";
    throw err;
  }

  const attendance = await MeetingAttendance.findOneAndUpdate(
    { meetingId, memberId },
    {
      $set: {
        attended: Boolean(attended),
        evidenceDocId: evidenceDocId || undefined,
        recordedBy,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return attendance;
}

/**
 * listMeetingAttendance(meetingId)
 */
export async function listMeetingAttendanceService(meetingId) {
  if (!meetingId) {
    const err = new Error("meetingId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(meetingId)) {
    const err = new Error("Invalid meetingId");
    err.code = "INVALID_MEETING_ID";
    throw err;
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.code = "MEETING_NOT_FOUND";
    throw err;
  }

  const attendanceList = await MeetingAttendance.find({ meetingId })
    .populate("memberId", "firstName lastName phone email")
    .populate("recordedBy", "firstName lastName email")
    .sort({ createdAt: 1 })
    .lean();

  return attendanceList;
}
