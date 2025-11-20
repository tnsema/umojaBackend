// models/Address.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const addressSchema = new Schema(
  {
    streetNumber: { type: String, trim: true },
    streetName: { type: String, trim: true },
    suburb: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "South Africa" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // link back to user
  },
  { timestamps: true }
);

export default model("Address", addressSchema);
