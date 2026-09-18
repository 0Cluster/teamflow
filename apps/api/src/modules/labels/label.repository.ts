import { Label } from "./label.model.js";

interface CreateLabelData {
  organizationId: string;
  name: string;
  color: string;
  createdBy: string;
}

export async function createLabel(
  data: CreateLabelData,
) {
  return Label.create(data);
}

export async function findLabelsByOrganization(
  organizationId: string,
) {
  return Label.find({
    organizationId,
  })
    .sort({ name: 1 })
    .exec();
}

export async function findLabelById(
  organizationId: string,
  labelId: string,
) {
  return Label.findOne({
    _id: labelId,
    organizationId,
  }).exec();
}

export async function findLabelsByIds(
  organizationId: string,
  labelIds: string[],
) {
  return Label.find({
    _id: { $in: labelIds },
    organizationId,
  })
    .select("_id")
    .exec();
}

export async function updateLabel(
  organizationId: string,
  labelId: string,
  data: {
    name?: string;
    color?: string;
  },
) {
  return Label.findOneAndUpdate(
    {
      _id: labelId,
      organizationId,
    },
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function deleteLabel(
  organizationId: string,
  labelId: string,
) {
  return Label.findOneAndDelete({
    _id: labelId,
    organizationId,
  }).exec();
}

export async function deleteLabelsByOrganization(
  organizationId: string,
): Promise<void> {
  await Label.deleteMany({
    organizationId,
  }).exec();
}
