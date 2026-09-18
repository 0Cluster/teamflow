import { Schema, model } from "mongoose";

const labelSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },

    color: {
      type: String,
      required: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

labelSchema.index(
  {
    organizationId: 1,
    name: 1,
  },
  {
    unique: true,
  },
);

export const Label = model("Label", labelSchema);
