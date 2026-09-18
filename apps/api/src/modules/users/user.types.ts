export interface IUser {
  email: string;
  passwordHash: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
