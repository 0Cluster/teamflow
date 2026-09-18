import { Schema, model } from "mongoose";

const activitySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },

    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

activitySchema.index({
  organizationId: 1,
  createdAt: -1,
});

activitySchema.index({
  projectId: 1,
  createdAt: -1,
});

activitySchema.index({
  taskId: 1,
  createdAt: -1,
});

export const Activity = model("Activity", activitySchema);
