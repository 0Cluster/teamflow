export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Comment {
  id: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  authorId: string;
  author?: CommentAuthor;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface UpdateCommentInput {
  content: string;
}
