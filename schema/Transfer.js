import mongoose from "mongoose";

const { Schema, model } = mongoose;

const transferSchema = new Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "CREATED", // initial status
        "SUBMITTED", // after submission of proof of payment
        "DECLINED", // when admin declines the transfer
        "APPROVED", // when admin approves the transfer
        "PAID", // when transfer is marked as paid,
        "FAILED", // when transfer fails
        "CANCELLED", // when user/admin cancels the transfer
      ],
      default: "CREATED",
    },

    pop: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Transfer", transferSchema);
