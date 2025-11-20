// controllers/address.controller.js

import {
  createAddressService,
  getAddressByIdService,
  listUserAddressesService,
  updateAddressService,
  deleteAddressService,
} from "../services/address.service.js";

// POST /addresses
export async function createMyAddress(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const address = await createAddressService(userId, req.body);

    return res.status(201).json({
      status: true,
      message: "Address created",
      data: address,
    });
  } catch (err) {
    console.error("createMyAddress error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to create address",
    });
  }
}

// GET /addresses
export async function listMyAddresses(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const addresses = await listUserAddressesService(userId);

    return res.status(200).json({
      status: true,
      data: addresses,
    });
  } catch (err) {
    console.error("listMyAddresses error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch addresses",
    });
  }
}

// GET /addresses/:id
export async function getMyAddress(req, res) {
  try {
    const userId = req.payload?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const address = await getAddressByIdService(userId, id);
    if (!address) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: address,
    });
  } catch (err) {
    console.error("getMyAddress error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch address",
    });
  }
}

// PATCH /addresses/:id
export async function updateMyAddress(req, res) {
  try {
    const userId = req.payload?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const updated = await updateAddressService(userId, id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: false,
        message: "Address not found or not owned by user",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Address updated",
      data: updated,
    });
  } catch (err) {
    console.error("updateMyAddress error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to update address",
    });
  }
}

// DELETE /addresses/:id
export async function deleteMyAddress(req, res) {
  try {
    const userId = req.payload?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const deleted = await deleteAddressService(userId, id);
    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: "Address not found or not owned by user",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Address deleted",
    });
  } catch (err) {
    console.error("deleteMyAddress error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to delete address",
    });
  }
}
