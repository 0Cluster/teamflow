export interface IProject {
  organizationId: string;
  name: string;
  key: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
