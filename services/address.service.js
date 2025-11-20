// services/address.service.js

import mongoose from "mongoose";
import Models from "../model/model.js";

const { address: Address } = Models;
const { isValidObjectId } = mongoose;

// Create new address for user
export async function createAddressService(userId, data = {}) {
  if (!userId) throw new Error("User ID is required");
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID");

  const {
    streetNumber,
    streetName,
    suburb,
    city,
    province,
    postalCode,
    country,
  } = data;

  const address = await Address.create({
    user: userId,
    streetNumber: streetNumber || "",
    streetName: streetName || "",
    suburb: suburb || "",
    city: city || "",
    province: province || "",
    postalCode: postalCode || "",
    country: country || "South Africa",
  });

  return address;
}

// Get a single address by id (must belong to user)
export async function getAddressByIdService(userId, addressId) {
  if (!userId || !addressId) throw new Error("User ID and address ID required");
  if (!isValidObjectId(userId) || !isValidObjectId(addressId)) {
    throw new Error("Invalid ID");
  }

  const address = await Address.findOne({ _id: addressId, user: userId });

  return address; // may be null
}

// List all addresses for user
export async function listUserAddressesService(userId) {
  if (!userId) throw new Error("User ID is required");
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID");

  const addresses = await Address.find({ user: userId }).sort({
    createdAt: -1,
  });

  return addresses;
}

// Update one address (only if owned by user)
export async function updateAddressService(userId, addressId, data = {}) {
  if (!userId || !addressId) throw new Error("User ID and address ID required");
  if (!isValidObjectId(userId) || !isValidObjectId(addressId)) {
    throw new Error("Invalid ID");
  }

  const updateFields = {};
  [
    "streetNumber",
    "streetName",
    "suburb",
    "city",
    "province",
    "postalCode",
    "country",
  ].forEach((field) => {
    if (data[field] !== undefined) {
      updateFields[field] = data[field];
    }
  });

  const updated = await Address.findOneAndUpdate(
    { _id: addressId, user: userId },
    { $set: updateFields },
    { new: true }
  );

  return updated; // may be null
}

// Delete address (only if owned by user)
export async function deleteAddressService(userId, addressId) {
  if (!userId || !addressId) throw new Error("User ID and address ID required");
  if (!isValidObjectId(userId) || !isValidObjectId(addressId)) {
    throw new Error("Invalid ID");
  }

  const deleted = await Address.findOneAndDelete({
    _id: addressId,
    user: userId,
  });

  return deleted; // may be null
}

// 🔁 Upsert: update existing address for user or create if none
export async function upsertAddressForUserService(userId, data = {}) {
  if (!userId) throw new Error("User ID is required");
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID");

  const existing = await Address.findOne({ user: userId });

  if (existing) {
    [
      "streetNumber",
      "streetName",
      "suburb",
      "city",
      "province",
      "postalCode",
      "country",
    ].forEach((field) => {
      if (data[field] !== undefined) {
        existing[field] = data[field];
      }
    });
    await existing.save();
    return existing;
  }

  // If not found, create new
  return createAddressService(userId, data);
}
