// services/meeting.service.js
import mongoose from "mongoose";
import Meeting from "../schema/Meeting.js";
import MeetingAttendance from "../schema/MeetingAttendance.js";
import User from "../schema/User.js"; // adjust path if different

const { Types } = mongoose;
const { ObjectId } = Types;

function assertValidObjectId(id, fieldName = "id") {
  if (!ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Create a meeting.
 * payload: { title, date, startTime?, endTime?, agenda?, description?, location?, chairId, decisionsSummary?, minutesLink? }
 * year is derived from date if not provided.
 */
// Create meeting itself

const MEMBER_ROLE_ID = "69162e65f0d00f0f2241aa5a"; // adjust to actual MEMBER role ID

function buildTime(meetingDate, timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(meetingDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export async function createMeetingService({
  chairId,
  title,
  date,
  startTime,
  endTime,
  agenda,
  description,
  location,
  year,
  minutesLink,
}) {
  if (!chairId) {
    const err = new Error("chairId is required");
    err.statusCode = 400;
    throw err;
  }

  if (!title) {
    const err = new Error("title is required");
    err.statusCode = 400;
    throw err;
  }

  if (!date) {
    const err = new Error("date is required");
    err.statusCode = 400;
    throw err;
  }

  // Optional: validate ObjectId
  try {
    assertValidObjectId(chairId, "chairId");
  } catch (e) {
    e.statusCode = e.statusCode || 400;
    throw e;
  }

  // Base meeting date (day of the meeting)
  const meetingDate = new Date(date);
  if (Number.isNaN(meetingDate.getTime())) {
    const err = new Error("Invalid date");
    err.statusCode = 400;
    throw err;
  }

  // ----- Determine startTime -----
  let finalStartTime;
  if (startTime) {
    // If you send an ISO string from frontend, this works directly.
    // If you decide later to send just "18:00", you can swap this
    // to use buildTime(meetingDate, startTime) instead.
    finalStartTime = new Date(startTime);
    if (Number.isNaN(finalStartTime.getTime())) {
      // fallback if invalid
      finalStartTime = buildTime(meetingDate, "18:00");
    }
  } else {
    // Default 18:00 on meetingDate
    finalStartTime = buildTime(meetingDate, "18:00");
  }

  // ----- Determine endTime -----
  let finalEndTime;
  if (endTime) {
    finalEndTime = new Date(endTime);
    if (Number.isNaN(finalEndTime.getTime())) {
      finalEndTime = buildTime(meetingDate, "19:00");
    }
  } else {
    // Default 19:00 on meetingDate
    finalEndTime = buildTime(meetingDate, "19:00");
  }

  const meeting = await Meeting.create({
    chairId,
    title,
    agenda,
    description,
    date: meetingDate,
    startTime: finalStartTime,
    endTime: finalEndTime,
    location,
    year: year || String(meetingDate.getFullYear()),
    minutesLink,
    status: "SCHEDULED",
  });

  return meeting;
}

// 🔥 Auto-generate attendance list for ALL members
export async function generateAttendanceListForMeeting(meetingId) {
  if (!meetingId || !mongoose.isValidObjectId(meetingId)) {
    const err = new Error("Invalid meetingId");
    err.statusCode = 400;
    throw err;
  }

  // Get all users that are MEMBERS
  const members = await User.find({
    roles: MEMBER_ROLE_ID, // roles is an array of ObjectId
  }).select("_id");

  if (!members.length) {
    console.log(
      `[generateAttendanceListForMeeting] No members found for meeting ${meetingId}`
    );
    return { meetingId, createdCount: 0 };
  }

  let createdCount = 0;

  for (const member of members) {
    const res = await MeetingAttendance.updateOne(
      {
        meetingId,
        memberId: member._id,
      },
      {
        $setOnInsert: {
          meetingId,
          memberId: member._id,
          attended: false,
        },
      },
      { upsert: true }
    );

    if (res.upsertedCount > 0) {
      createdCount += 1;
    }
  }

  return { meetingId, createdCount };
}

/**
 * Get meeting by id.
 */
export async function getMeetingById(id) {
  assertValidObjectId(id, "meetingId");
  const meeting = await Meeting.findById(id).populate(
    "chairId",
    "firstName lastName phone"
  );
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.statusCode = 404;
    throw err;
  }
  return meeting;
}

/**
 * Get meetings by year (or all if year not given).
 */
export async function getMeetingsByYear({ year }) {
  const filter = {};
  if (year) {
    const numericYear = Number(year);
    if (!numericYear) {
      const err = new Error("Invalid year");
      err.statusCode = 400;
      throw err;
    }
    filter.year = numericYear;
  }

  const meetings = await Meeting.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return meetings;
}

/**
 * Delete a meeting and all its attendance records.
 */
export async function deleteMeeting(id) {
  assertValidObjectId(id, "meetingId");
  const meeting = await Meeting.findById(id);
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.statusCode = 404;
    throw err;
  }

  await MeetingAttendance.deleteMany({ meetingId: id });
  await meeting.deleteOne();

  return { deleted: true };
}

/**
 * Update meeting status: SCHEDULED / COMPLETED / CANCELLED
 */
export async function updateMeetingStatus(id, status) {
  assertValidObjectId(id, "meetingId");
  const allowed = ["SCHEDULED", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(status)) {
    const err = new Error("Invalid status");
    err.statusCode = 400;
    throw err;
  }

  const meeting = await Meeting.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!meeting) {
    const err = new Error("Meeting not found");
    err.statusCode = 404;
    throw err;
  }

  return meeting;
}

/**
 * Generate attendance list for a meeting.
 * - Fetches all members (you can refine the filter by roles later)
 * - Creates MeetingAttendance for each, if not already existing.
 */
export async function createAttendanceListForMeeting(meetingId) {
  assertValidObjectId(meetingId, "meetingId");

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.statusCode = 404;
    throw err;
  }

  // TODO: refine filter to "members only" when role model is final.
  const members = await User.find(
    {
      // adjust filter for MEMBER role as needed:
      // roles: MEMBER_ROLE_ID,
      // status: "ACTIVE",
    },
    { _id: 1 }
  ).lean();

  if (!members.length) {
    return { createdCount: 0 };
  }

  const bulkOps = members.map((m) => ({
    updateOne: {
      filter: {
        meetingId,
        memberId: m._id,
      },
      update: {
        $setOnInsert: {
          meetingId,
          memberId: m._id,
          attended: false,
        },
      },
      upsert: true,
    },
  }));

  const result = await MeetingAttendance.bulkWrite(bulkOps, {
    ordered: false,
  });

  return {
    createdCount: result.upsertedCount || 0,
    totalMembers: members.length,
  };
}

/**
 * Mark present / absent for a single member in a meeting.
 * payload: { meetingId, memberId, attended = true }
 */
export async function markMemberAttendance({ meetingId, memberId, attended }) {
  assertValidObjectId(meetingId, "meetingId");
  assertValidObjectId(memberId, "memberId");

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.statusCode = 404;
    throw err;
  }

  const record = await MeetingAttendance.findOneAndUpdate(
    { meetingId, memberId },
    {
      $set: {
        meetingId,
        memberId,
        attended: attended !== undefined ? !!attended : true,
      },
    },
    {
      upsert: true,
      new: true,
    }
  ).populate("memberId", "firstName lastName phone");

  return record;
}

export async function getMeetingsForMember(memberId) {
  if (!memberId) {
    const err = new Error("memberId is required");
    err.statusCode = 400;
    throw err;
  }

  assertValidObjectId(memberId, "memberId");

  const attendanceRecords = await MeetingAttendance.find({
    memberId,
  })
    .populate("meetingId")
    .lean();

  const now = new Date();
  const upcoming = [];
  const past = [];

  for (const rec of attendanceRecords) {
    const m = rec.meetingId;
    if (!m) continue;

    const item = {
      _id: m._id,
      title: m.title,
      agenda: m.agenda,
      description: m.description,
      date: m.date,
      startTime: m.startTime,
      endTime: m.endTime,
      year: m.year,
      location: m.location,
      status: m.status,
      minutesLink: m.minutesLink,
      decisionsSummary: m.decisionsSummary,
      attendance: {
        attended: rec.attended,
        evidenceDocId: rec.evidenceDocId,
      },
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };

    // Decide upcoming vs past:
    //  - future dates (and not cancelled) → upcoming
    //  - everything else → past
    if (m.date && m.date >= now && m.status !== "CANCELLED") {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  }

  // Sort upcoming ascending by date, past descending by date
  upcoming.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { upcoming, past };
}

/**
 * Get a single meeting by ID, including this member's attendance info.
 */
export async function getMeetingForMemberById(meetingId, memberId) {
  if (!meetingId) {
    const err = new Error("meetingId is required");
    err.statusCode = 400;
    throw err;
  }
  if (!memberId) {
    const err = new Error("memberId is required");
    err.statusCode = 400;
    throw err;
  }

  assertValidObjectId(meetingId, "meetingId");
  assertValidObjectId(memberId, "memberId");

  const meeting = await Meeting.findById(meetingId).lean();
  if (!meeting) {
    const err = new Error("Meeting not found");
    err.statusCode = 404;
    throw err;
  }

  const attendance = await MeetingAttendance.findOne({
    meetingId,
    memberId,
  })
    .lean()
    .select("attended evidenceDocId createdAt updatedAt");

  return {
    ...meeting,
    attendance: attendance
      ? {
          attended: !!attendance.attended,
          evidenceDocId: attendance.evidenceDocId,
        }
      : {
          attended: false,
        },
  };
}
