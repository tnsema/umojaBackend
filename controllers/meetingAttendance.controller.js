// controllers/meetingAttendance.controller.js

import {
  recordAttendanceService,
  listMeetingAttendanceService,
} from "../services/meetingAttendance.service.js";

/**
 * POST /meetings/:meetingId/attendance
 *
 * Body (form-data):
 *  - memberId
 *  - attended (e.g. "true" or "false")
 *  - evidenceDocId? (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER") (recommended)
 */
export async function recordAttendance(req, res) {
  try {
    const { meetingId } = req.params;
    const { memberId, attended, evidenceDocId } = req.body || {};
    const recordedBy = req.payload?.userId;

    const attendance = await recordAttendanceService({
      meetingId,
      memberId,
      attended: attended === "true" || attended === true,
      evidenceDocId,
      recordedBy,
    });

    return res.status(200).json({
      status: true,
      message: "Attendance recorded successfully",
      data: attendance,
    });
  } catch (err) {
    console.error("Error in recordAttendance:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "meetingId, memberId, attended and recordedBy are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid meetingId, memberId or recordedBy",
      });
    }

    if (err.code === "MEETING_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Meeting not found",
      });
    }

    if (err.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Member not found",
      });
    }

    if (err.code === "RECORDER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Recorded-by user not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while recording attendance",
    });
  }
}

/**
 * GET /meetings/:meetingId/attendance
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER") (recommended)
 */
export async function listMeetingAttendance(req, res) {
  try {
    const { meetingId } = req.params;

    const attendanceList = await listMeetingAttendanceService(meetingId);

    return res.status(200).json({
      status: true,
      data: attendanceList,
    });
  } catch (err) {
    console.error("Error in listMeetingAttendance:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "meetingId is required",
      });
    }

    if (err.code === "INVALID_MEETING_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid meetingId",
      });
    }

    if (err.code === "MEETING_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Meeting not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching meeting attendance list",
    });
  }
}
