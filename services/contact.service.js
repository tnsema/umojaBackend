// services/contact.service.js

import Models from "../model/model.js";
import mongoose from "mongoose";

const { user: User, userContact: UserContact } = Models;

export async function addContactByIdService(ownerId, contactId, label) {
  if (!mongoose.isValidObjectId(contactId)) {
    const err = new Error("Invalid contactId");
    err.code = "INVALID_CONTACT_ID";
    throw err;
  }

  const contactUser = await User.findById(contactId);
  if (!contactUser) {
    const err = new Error("Contact user not found");
    err.code = "CONTACT_NOT_FOUND";
    throw err;
  }

  if (String(contactUser._id) === String(ownerId)) {
    const err = new Error("You cannot add yourself as a contact");
    err.code = "CANNOT_ADD_SELF";
    throw err;
  }

  const contact = await UserContact.findOneAndUpdate(
    { owner: ownerId, contact: contactUser._id },
    { $set: { label } },
    { new: true, upsert: true }
  ).populate("contact", "firstName lastName phone email status");

  return contact;
}

export async function addContactByPhoneService(ownerId, phone, label) {
  const cleanedPhone = phone?.trim();
  if (!cleanedPhone) {
    const err = new Error("Phone is required");
    err.code = "PHONE_REQUIRED";
    throw err;
  }

  const contactUser = await User.findOne({ phone: cleanedPhone });
  if (!contactUser) {
    const err = new Error("Contact user not found");
    err.code = "CONTACT_NOT_FOUND";
    throw err;
  }

  if (String(contactUser._id) === String(ownerId)) {
    const err = new Error("You cannot add yourself as a contact");
    err.code = "CANNOT_ADD_SELF";
    throw err;
  }

  const contact = await UserContact.findOneAndUpdate(
    { owner: ownerId, contact: contactUser._id },
    { $set: { label } },
    { new: true, upsert: true }
  ).populate("contact", "firstName lastName phone email status");

  return contact;
}

export async function listContactsService(ownerId) {
  const contacts = await UserContact.find({ owner: ownerId })
    .populate("contact", "firstName lastName phone email status")
    .sort({ createdAt: -1 })
    .lean();

  return contacts;
}

export async function removeContactService(ownerId, contactId) {
  const deleted = await UserContact.findOneAndDelete({
    owner: ownerId,
    contact: contactId,
  });

  if (!deleted) {
    const err = new Error("Contact not found in your list");
    err.code = "CONTACT_NOT_IN_LIST";
    throw err;
  }

  return deleted;
}
