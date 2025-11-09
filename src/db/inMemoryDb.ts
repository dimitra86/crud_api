import { User } from "../types/user";
import cluster from "cluster";

const users = new Map<string, User>();

if (!cluster.isMaster) {
  process.send && process.send({ type: "getState" });
  process.on("message", (msg: any) => {
    if (!msg || !msg.type) return;
    if (msg.type === "state" && Array.isArray(msg.state)) {
      users.clear();
      for (const [k, v] of msg.state) users.set(k, v);
    } else if (msg.type === "stateUpdate") {
      const { action, payload } = msg;
      if (action === "create" || action === "update")
        users.set(payload.id, payload);
      else if (action === "delete") users.delete(payload.id);
      else if (action === "clear") users.clear();
    }
  });
}

export const db = {
  async getAll(): Promise<User[]> {
    return Array.from(users.values());
  },
  async getById(id: string): Promise<User | null> {
    return users.get(id) ?? null;
  },
  async create(user: User): Promise<User> {
    users.set(user.id, user);
    if (!cluster.isMaster)
      process.send && process.send({ type: "create", payload: user });
    return user;
  },
  async update(id: string, user: User): Promise<User | null> {
    if (!users.has(id)) return null;
    users.set(id, user);
    if (!cluster.isMaster)
      process.send && process.send({ type: "update", payload: user });
    return user;
  },
  async delete(id: string): Promise<boolean> {
    const res = users.delete(id);
    if (!cluster.isMaster && res)
      process.send && process.send({ type: "delete", payload: { id } });
    return res;
  },
  async clear(): Promise<void> {
    users.clear();
    if (!cluster.isMaster) process.send && process.send({ type: "clear" });
  },
};
