// models/deposit.model.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

/*
|--------------------------------------------------------------------------
| ENUMS (Recommended)
|--------------------------------------------------------------------------
*/

export const DepositStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

export const DepositPurpose = {
  WALLET_TOPUP: "WALLET_TOPUP",
  TRANSFER_FUNDING: "TRANSFER_FUNDING",
  CONTRIBUTION: "CONTRIBUTION",
  LOAN: "LOAN",
  PROJECT: "PROJECT",
  OTHER: "OTHER",
};

export const LinkedEntityTypes = {
  TRANSFER: "TRANSFER",
  CONTRIBUTION: "CONTRIBUTION",
  LOAN: "LOAN",
  PROJECT: "PROJECT",
  MEMBER_UPGRADE: "MEMBER_UPGRADE",
  OTHER: "OTHER",
};

/*
|--------------------------------------------------------------------------
| SCHEMA
|--------------------------------------------------------------------------
*/

const depositSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    popUrl: {
      type: String,
      required: false, // some deposits may be manual or future APIs
    },

    bankRef: {
      type: String,
      required: false,
    },

    purpose: {
      type: String,
      enum: Object.values(DepositPurpose),
      default: DepositPurpose.WALLET_TOPUP,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(DepositStatus),
      default: DepositStatus.PENDING,
    },

    linkedEntity: {
      entityType: {
        type: String,
        enum: Object.values(LinkedEntityTypes),
        default: null,
      },
      entityId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
    },

    processedAt: {
      type: Date, // when VERIFIED or REJECTED
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

/*
|--------------------------------------------------------------------------
| HOOKS
|--------------------------------------------------------------------------
|
| Make verification idempotent (optional improvement)
|
*/

depositSchema.pre("save", function (next) {
  if (
    (this.status === DepositStatus.VERIFIED ||
      this.status === DepositStatus.REJECTED) &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }

  next();
});

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

depositSchema.index({ status: 1 });
depositSchema.index({ purpose: 1 });
depositSchema.index({ "linkedEntity.entityType": 1 });
depositSchema.index({ "linkedEntity.entityId": 1 });

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const Deposit = model("Deposit", depositSchema);
export default Deposit;
