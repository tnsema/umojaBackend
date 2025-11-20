// models/Address.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const addressSchema = new Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "South Africa" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // link back to user
  },
  { timestamps: true }
);

export default model("Address", addressSchema);
