// controllers/meeting.controller.js

import {
  createMeetingService,
  updateMeetingService,
  deleteMeetingService,
  setMeetingDecisionSummaryService,
} from "../services/meeting.service.js";

/**
 * POST /meetings
 * Body (form-data):
 *  - title
 *  - date         (ISO or yyyy-mm-dd)
 *  - time?        ("18:00–20:00")
 *  - agenda?
 *  - createdBy?   (optional; if not provided, use logged-in userId)
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER") (recommended at route)
 */
export async function createMeeting(req, res) {
  try {
    const {
      title,
      date,
      time,
      agenda,
      createdBy: bodyCreatedBy,
    } = req.body || {};

    const createdBy = bodyCreatedBy || req.payload?.userId;

    const meeting = await createMeetingService({
      title,
      date,
      time,
      agenda,
      createdBy,
    });

    return res.status(201).json({
      status: true,
      message: "Meeting created successfully",
      data: meeting,
    });
  } catch (err) {
    console.error("Error in createMeeting:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "title, date and createdBy are required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid createdBy userId",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Creator user not found",
      });
    }

    if (err.code === "INVALID_DATE") {
      return res.status(400).json({
        status: false,
        message: "Invalid date",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating meeting",
    });
  }
}

/**
 * POST /meetings/:meetingId
 * Body (form-data):
 *  - title?
 *  - date?
 *  - time?
 *  - agenda?
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER")
 */
export async function updateMeeting(req, res) {
  try {
    const { meetingId } = req.params;
    const { title, date, time, agenda } = req.body || {};

    const meeting = await updateMeetingService({
      meetingId,
      fields: { title, date, time, agenda },
    });

    return res.status(200).json({
      status: true,
      message: "Meeting updated successfully",
      data: meeting,
    });
  } catch (err) {
    console.error("Error in updateMeeting:", err);

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

    if (err.code === "NO_UPDATE_FIELDS") {
      return res.status(400).json({
        status: false,
        message: "No fields to update",
      });
    }

    if (err.code === "INVALID_DATE") {
      return res.status(400).json({
        status: false,
        message: "Invalid date",
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
      message: "Server error while updating meeting",
    });
  }
}

/**
 * DELETE /meetings/:meetingId
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER")
 */
export async function deleteMeeting(req, res) {
  try {
    const { meetingId } = req.params;

    const result = await deleteMeetingService({ meetingId });

    return res.status(200).json({
      status: true,
      message: "Meeting deleted successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in deleteMeeting:", err);

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
      message: "Server error while deleting meeting",
    });
  }
}

/**
 * POST /meetings/:meetingId/decision-summary
 * Body (form-data):
 *  - summary
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER")
 */
export async function setMeetingDecisionSummary(req, res) {
  try {
    const { meetingId } = req.params;
    const { summary } = req.body || {};

    const meeting = await setMeetingDecisionSummaryService({
      meetingId,
      summary,
    });

    return res.status(200).json({
      status: true,
      message: "Meeting decision summary updated",
      data: meeting,
    });
  } catch (err) {
    console.error("Error in setMeetingDecisionSummary:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "meetingId and summary are required",
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
      message: "Server error while updating decision summary",
    });
  }
}
