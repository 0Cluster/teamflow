import { api } from "../../lib/api.js";

import type {
  Comment,
  CommentAuthor,
  CreateCommentInput,
  UpdateCommentInput,
} from "./comment.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface BackendAuthor {
  _id: string;
  name: string;
  email: string;
}

interface BackendComment {
  _id: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  authorId: string | BackendAuthor;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeComment(
  comment: BackendComment,
): Comment {
  let authorId: string;
  let author: CommentAuthor | undefined;

  if (typeof comment.authorId === "string") {
    authorId = comment.authorId;
  } else {
    authorId = comment.authorId._id;

    author = {
      id: comment.authorId._id,
      name: comment.authorId.name,
      email: comment.authorId.email,
    };
  }

  return {
    id: comment._id,
    organizationId: comment.organizationId,
    projectId: comment.projectId,
    taskId: comment.taskId,
    authorId,
    author,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export async function listComments(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<Comment[]> {
  const response = await api.get<
    ApiResponse<BackendComment[]>
  >(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
  );

  return response.data.data.map(normalizeComment);
}

export async function createComment(
  organizationId: string,
  projectId: string,
  taskId: string,
  input: CreateCommentInput,
): Promise<Comment> {
  const response = await api.post<
    ApiResponse<BackendComment>
  >(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
    input,
  );

  return normalizeComment(response.data.data);
}

export async function updateComment(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  input: UpdateCommentInput,
): Promise<Comment> {
  const response = await api.patch<
    ApiResponse<BackendComment>
  >(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
    input,
  );

  return normalizeComment(response.data.data);
}

export async function deleteComment(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  await api.delete(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
  );
}
