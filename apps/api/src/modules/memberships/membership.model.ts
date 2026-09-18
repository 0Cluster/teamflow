import { Schema, model } from "mongoose";

const membershipSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: [
        "OWNER",
        "ADMIN",
        "MEMBER",
        "VIEWER",
      ],
      required: true,
      default: "MEMBER",
    },
  },
  {
    timestamps: true,
  },
);

membershipSchema.index(
  {
    organizationId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

membershipSchema.index({
  userId: 1,
});

export const Membership = model(
  "Membership",
  membershipSchema,
);
