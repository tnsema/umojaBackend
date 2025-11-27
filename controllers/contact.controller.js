// controllers/contact.controller.js
import {
  addContactByIdService,
  addContactByPhoneService,
  listContactsService,
  removeContactService,
} from "../services/contact.service.js";

export async function addContactById(req, res) {
  try {
    const ownerId = req.payload?.userId;
    if (!ownerId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const { contactId, label } = req.body || {};

    if (!contactId) {
      return res.status(400).json({
        status: false,
        message: "contactId is required",
      });
    }

    const contact = await addContactByIdService(ownerId, contactId, label);

    return res.status(201).json({
      status: true,
      message: "Contact added successfully (by ID)",
      data: contact,
    });
  } catch (err) {
    console.error("addContactById error:", err);

    if (err.code === "INVALID_CONTACT_ID") {
      return res
        .status(400)
        .json({ status: false, message: "Invalid contactId" });
    }

    if (err.code === "CONTACT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "The user you are trying to add was not found",
      });
    }

    if (err.code === "CANNOT_ADD_SELF") {
      return res.status(400).json({ status: false, message: err.message });
    }

    if (err.code === 11000 || err.code === "E11000") {
      return res.status(409).json({
        status: false,
        message: "This user is already in your contacts",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while adding contact by ID",
    });
  }
}

export async function addContactByPhone(req, res) {
  try {
    const ownerId = req.payload?.userId;
    if (!ownerId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const { phone, label } = req.body || {};

    if (!phone) {
      return res.status(400).json({
        status: false,
        message: "phone is required",
      });
    }

    const contact = await addContactByPhoneService(ownerId, phone, label);

    return res.status(201).json({
      status: true,
      message: "Contact added successfully (by phone)",
      data: contact,
    });
  } catch (err) {
    console.error("addContactByPhone error:", err);

    if (err.code === "PHONE_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Phone is required",
      });
    }

    if (err.code === "CONTACT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "The user with this phone number was not found",
      });
    }

    if (err.code === "CANNOT_ADD_SELF") {
      return res.status(400).json({ status: false, message: err.message });
    }

    if (err.code === 11000 || err.code === "E11000") {
      return res.status(409).json({
        status: false,
        message: "This user is already in your contacts",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while adding contact by phone",
    });
  }
}

export async function listMyContacts(req, res) {
  try {
    const ownerId = req.payload?.userId;
    if (!ownerId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const contacts = await listContactsService(ownerId);

    return res.status(200).json({
      status: true,
      message: "Contacts fetched successfully",
      data: contacts,
    });
  } catch (err) {
    console.error("listMyContacts error:", err);
    return res.status(500).json({
      status: false,
      message: "Server error while fetching contacts",
    });
  }
}

export async function removeContact(req, res) {
  try {
    const ownerId = req.payload?.userId;
    if (!ownerId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({
        status: false,
        message: "contactId param is required",
      });
    }

    await removeContactService(ownerId, contactId);

    return res.status(200).json({
      status: true,
      message: "Contact removed successfully",
    });
  } catch (err) {
    console.error("removeContact error:", err);

    if (err.code === "CONTACT_NOT_IN_LIST") {
      return res.status(404).json({
        status: false,
        message: "This user is not in your contact list",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while removing contact",
    });
  }
}
