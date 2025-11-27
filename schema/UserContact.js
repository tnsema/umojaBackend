// schema/UserContact.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userContactSchema = new Schema(
  {
    owner: {
      // The user who owns this contact entry
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contact: {
      // The user that is being added as a contact
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      // Optional nickname: "Mom", "My main account", etc.
      type: String,
      trim: true,
    },
    isFavourite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicates: one (owner, contact) pair per row
userContactSchema.index({ owner: 1, contact: 1 }, { unique: true });

export default model("UserContact", userContactSchema);
