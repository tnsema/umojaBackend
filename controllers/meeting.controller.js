// controllers/meeting.controller.js
import {
  createMeetingService,
  generateAttendanceListForMeeting,
  getMeetingById,
  getMeetingsByYear,
  deleteMeeting,
  updateMeetingStatus,
  createAttendanceListForMeeting,
  markMemberAttendance,
  getMeetingsForMember,
  getMeetingForMemberById,
} from "../services/meeting.service.js";

/**
 * POST /admin/meetings
 * Body: { title, date, startTime?, endTime?, agenda?, description?, location?, decisionsSummary?, minutesLink? }
 * chairId is taken from req.payload.userId
 */
// POST /api/admin/meetings
export async function createMeetingController(req, res) {
  try {
    const chairId = req.payload?.userId; // admin creating the meeting
    if (!chairId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const {
      title,
      agenda,
      description,
      date,
      startTime,
      endTime,
      location,
      year,
      minutesLink,
    } = req.body || {};

    if (!title || !date) {
      return res.status(400).json({
        status: false,
        message: "Title and date are required",
      });
    }

    // 1) Create the meeting
    const meeting = await createMeetingService({
      chairId,
      title,
      agenda,
      description,
      date,
      startTime,
      endTime,
      location,
      year,
      minutesLink,
    });

    // 2) 🔥 Auto-generate attendance for ALL MEMBERS
    const attendanceResult = await generateAttendanceListForMeeting(
      meeting._id
    );

    return res.status(201).json({
      status: true,
      message: "Meeting created and attendance list generated",
      data: {
        meeting,
        attendance: attendanceResult,
      },
    });
  } catch (err) {
    console.error("createMeetingController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while creating the meeting.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /admin/meetings/:id
 */
export async function getMeetingByIdController(req, res) {
  try {
    const { id } = req.params;

    const meeting = await getMeetingById(id);

    return res.json({
      status: true,
      message: "Meeting fetched successfully",
      data: { meeting },
    });
  } catch (err) {
    console.error("getMeetingByIdController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching meeting.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /admin/meetings
 * Optional query: ?year=2026
 */
export async function getMeetingsByYearController(req, res) {
  try {
    const { year } = req.query;

    const meetings = await getMeetingsByYear({ year });

    return res.json({
      status: true,
      message: "Meetings fetched successfully",
      data: { meetings },
    });
  } catch (err) {
    console.error("getMeetingsByYearController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching meetings.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * DELETE /admin/meetings/:id
 */
export async function deleteMeetingController(req, res) {
  try {
    const { id } = req.params;

    const result = await deleteMeeting(id);

    return res.json({
      status: true,
      message: "Meeting deleted successfully",
      data: result,
    });
  } catch (err) {
    console.error("deleteMeetingController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while deleting the meeting.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * PATCH /admin/meetings/:id/status
 * Body: { status: "SCHEDULED" | "COMPLETED" | "CANCELLED" }
 */
export async function updateMeetingStatusController(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!status) {
      return res.status(400).json({
        status: false,
        message: "Field 'status' is required",
      });
    }

    const meeting = await updateMeetingStatus(id, status);

    return res.json({
      status: true,
      message: "Meeting status updated",
      data: { meeting },
    });
  } catch (err) {
    console.error("updateMeetingStatusController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while updating meeting status.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * POST /admin/meetings/:id/attendance/generate
 * Creates attendance rows for all members for this meeting
 */
export async function createAttendanceListController(req, res) {
  try {
    const { id } = req.params;

    const result = await createAttendanceListForMeeting(id);

    return res.json({
      status: true,
      message: "Attendance list generated for meeting",
      data: result,
    });
  } catch (err) {
    console.error("createAttendanceListController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while generating attendance list.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * PATCH /admin/meetings/:id/attendance/mark-present
 * Body: { memberId, attended? } (attended defaults to true)
 */
export async function markMemberPresentController(req, res) {
  try {
    const { id } = req.params;
    const { memberId, attended } = req.body ?? {};

    if (!memberId) {
      return res.status(400).json({
        status: false,
        message: "Field 'memberId' is required",
      });
    }

    const record = await markMemberAttendance({
      meetingId: id,
      memberId,
      attended,
    });

    return res.json({
      status: true,
      message: "Attendance updated for member",
      data: { attendance: record },
    });
  } catch (err) {
    console.error("markMemberPresentController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while updating attendance.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

export async function getMyMeetingsController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const data = await getMeetingsForMember(memberId);

    return res.json({
      status: true,
      message: "Meetings fetched successfully",
      data,
    });
  } catch (err) {
    console.error("getMyMeetingsController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching meetings.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /meetings/:id
 * Return full meeting info plus the member's attendance status.
 */
export async function getMeetingByIdForMemberController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    const meeting = await getMeetingForMemberById(id, memberId);

    return res.json({
      status: true,
      message: "Meeting fetched successfully",
      data: meeting,
    });
  } catch (err) {
    console.error("getMeetingByIdForMemberController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching meeting.";
    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}
