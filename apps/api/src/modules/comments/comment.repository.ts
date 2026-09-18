import { Comment } from "./comment.model.js";

interface CreateCommentData {
  organizationId: string;
  projectId: string;
  taskId: string;
  authorId: string;
  content: string;
}

export async function createComment(
  data: CreateCommentData,
) {
  return Comment.create(data);
}

export async function findCommentsByTask(
  organizationId: string,
  projectId: string,
  taskId: string,
) {
  return Comment.find({
    organizationId,
    projectId,
    taskId,
  })
    .populate("authorId", "name email")
    .sort({ createdAt: 1 })
    .exec();
}

export async function findCommentById(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
) {
  return Comment.findOne({
    _id: commentId,
    organizationId,
    projectId,
    taskId,
  }).exec();
}

export async function updateComment(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  content: string,
) {
  return Comment.findOneAndUpdate(
    {
      _id: commentId,
      organizationId,
      projectId,
      taskId,
    },
    {
      $set: { content },
    },
    {
      new: true,
    },
  ).exec();
}

export async function deleteComment(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
) {
  return Comment.findOneAndDelete({
    _id: commentId,
    organizationId,
    projectId,
    taskId,
  }).exec();
}

export async function deleteCommentsByTask(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await Comment.deleteMany({
    organizationId,
    projectId,
    taskId,
  }).exec();
}

export async function deleteCommentsByProject(
  organizationId: string,
  projectId: string,
): Promise<void> {
  await Comment.deleteMany({
    organizationId,
    projectId,
  }).exec();
}
