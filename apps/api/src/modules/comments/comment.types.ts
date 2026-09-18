export interface IComment {
  organizationId: string;
  projectId: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
