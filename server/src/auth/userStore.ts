import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { ensureDataRoot, usersFile } from "../persistence/userPaths.js";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface PublicUser {
  id: string;
  username: string;
  createdAt: number;
}

interface UsersFile {
  users: UserRecord[];
}

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

class UserStore {
  private cache: UsersFile | null = null;
  private writeLock: Promise<void> = Promise.resolve();

  private async load(): Promise<UsersFile> {
    if (this.cache) {
      return this.cache;
    }

    await ensureDataRoot();

    try {
      const raw = await fs.readFile(usersFile(), "utf-8");
      this.cache = JSON.parse(raw) as UsersFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.cache = { users: [] };
      } else {
        throw error;
      }
    }

    return this.cache;
  }

  private async save(): Promise<void> {
    if (!this.cache) {
      return;
    }

    const payload = JSON.stringify(this.cache, null, 2);
    this.writeLock = this.writeLock.then(() => fs.writeFile(usersFile(), payload, "utf-8"));
    await this.writeLock;
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const data = await this.load();
    const lowered = username.toLowerCase();
    return data.users.find((user) => user.username.toLowerCase() === lowered);
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const data = await this.load();
    return data.users.find((user) => user.id === id);
  }

  async register(username: string, password: string): Promise<PublicUser> {
    const trimmed = username.trim();

    if (!USERNAME_PATTERN.test(trimmed)) {
      throw new Error("Username must be 3-32 characters of letters, numbers, dot, underscore, or hyphen.");
    }

    if (typeof password !== "string" || password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const existing = await this.findByUsername(trimmed);

    if (existing) {
      throw new Error("Username is already taken.");
    }

    const data = await this.load();
    const passwordHash = await bcrypt.hash(password, 10);
    const record: UserRecord = {
      id: randomUUID(),
      username: trimmed,
      passwordHash,
      createdAt: Date.now()
    };
    data.users.push(record);
    await this.save();
    return toPublic(record);
  }

  async verify(username: string, password: string): Promise<UserRecord> {
    const user = await this.findByUsername(username.trim());

    if (!user) {
      throw new Error("Invalid username or password.");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new Error("Invalid username or password.");
    }

    return user;
  }
}

export function toPublic(user: UserRecord): PublicUser {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

export const userStore = new UserStore();
