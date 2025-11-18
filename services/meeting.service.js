// services/meeting.service.js
// Business logic for Umoja meetings.

import Models from "../model/model.js";
import mongoose from "mongoose";

const { meeting: Meeting, user: User } = Models;
const { isValidObjectId } = mongoose;

/**
 * createMeeting({ title, date, time, agenda, createdBy })
 */
export async function createMeetingService({
  title,
  date,
  time,
  agenda,
  createdBy,
}) {
  if (!title || !date || !createdBy) {
    const err = new Error("title, date and createdBy are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(createdBy)) {
    const err = new Error("Invalid createdBy userId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const creator = await User.findById(createdBy);
  if (!creator) {
    const err = new Error("Creator user not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    const err = new Error("Invalid date");
    err.code = "INVALID_DATE";
    throw err;
  }

  const meeting = await Meeting.create({
    title: String(title).trim(),
    date: dateObj,
    time: time ? String(time).trim() : "",
    agenda: agenda ? String(agenda).trim() : "",
    createdBy,
    decisionsSummary: "",
  });

  return meeting;
}

/**
 * updateMeeting({ meetingId, fields })
 *
 * fields can include: title, date, time, agenda
 */
export async function updateMeetingService({ meetingId, fields = {} }) {
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

  const update = {};
  const { title, date, time, agenda } = fields;

  if (title !== undefined) update.title = String(title).trim();
  if (time !== undefined) update.time = String(time).trim();
  if (agenda !== undefined) update.agenda = String(agenda).trim();

  if (date !== undefined) {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      const err = new Error("Invalid date");
      err.code = "INVALID_DATE";
      throw err;
    }
    update.date = d;
  }

  if (Object.keys(update).length === 0) {
    const err = new Error("No fields to update");
    err.code = "NO_UPDATE_FIELDS";
    throw err;
  }

  const meeting = await Meeting.findByIdAndUpdate(
    meetingId,
    { $set: update },
    { new: true }
  );

  if (!meeting) {
    const err = new Error("Meeting not found");
    err.code = "MEETING_NOT_FOUND";
    throw err;
  }

  return meeting;
}

/**
 * deleteMeeting({ meetingId })
 */
export async function deleteMeetingService({ meetingId }) {
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

  const meeting = await Meeting.findByIdAndDelete(meetingId);

  if (!meeting) {
    const err = new Error("Meeting not found");
    err.code = "MEETING_NOT_FOUND";
    throw err;
  }

  return { deleted: true, meeting };
}

/**
 * setMeetingDecisionSummary({ meetingId, summary })
 */
export async function setMeetingDecisionSummaryService({ meetingId, summary }) {
  if (!meetingId || summary === undefined) {
    const err = new Error("meetingId and summary are required");
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

  meeting.decisionsSummary = String(summary).trim();
  await meeting.save();

  return meeting;
}
