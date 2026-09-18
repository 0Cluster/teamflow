import { User } from "./user.model.js";

export async function findUserByEmail(email: string) {
  return User.findOne({ email }).exec();
}

export async function findUserByEmailWithPassword(email: string) {
  return User.findOne({ email }).select("+passwordHash").exec();
}
export async function findUserById(id: string) {
  return User.findById(id).exec();
}
export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return User.create(data);
}
