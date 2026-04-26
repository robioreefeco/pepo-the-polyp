import { eq, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, profiles, contributions, reefImages,
  type User, type InsertUser,
  type Profile, type InsertProfile,
  type Contribution, type InsertContribution,
  type LeaderboardEntry,
  type ReefImage, type InsertReefImage,
} from "@shared/schema";
import { randomUUID } from "crypto";

// ─── Interface ─────────────────────────────────────────────────────────────────
export interface IStorage {
  // legacy
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // profiles
  getProfile(id: string): Promise<Profile | undefined>;
  upsertProfile(profile: InsertProfile): Promise<Profile>;
  getAllProfiles(): Promise<Profile[]>;

  // contributions
  getContributions(profileId: string): Promise<Contribution[]>;
  addContribution(contribution: InsertContribution): Promise<Contribution>;
  hasContributionToday(profileId: string, type: string): Promise<boolean>;

  // leaderboard
  getLeaderboard(): Promise<LeaderboardEntry[]>;

  // ORCID
  saveOrcid(profileId: string, orcidId: string, orcidName: string): Promise<Profile>;
  clearOrcid(profileId: string): Promise<Profile>;

  // Ceramic + IDX
  saveCeramic(profileId: string, ceramicStreamId: string, ceramicDid: string): Promise<Profile>;

  // Geolocation
  saveLocation(profileId: string, latitude: number, longitude: number): Promise<Profile>;
  getMapMarkers(): Promise<{ id: string; displayName: string; avatarUrl: string; latitude: number; longitude: number; orcidId: string }[]>;

  // Reef Images
  createReefImage(data: InsertReefImage): Promise<ReefImage>;
  getReefImages(): Promise<ReefImage[]>;
}

// ─── Database-backed storage ───────────────────────────────────────────────────
export class DbStorage implements IStorage {

  // ── Legacy users ──────────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.username, username));
    return row;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values({ ...insertUser, id: randomUUID() }).returning();
    return row;
  }

  // ── Profiles ──────────────────────────────────────────────────────────────
  async getProfile(id: string): Promise<Profile | undefined> {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    return row;
  }

  async upsertProfile(profile: InsertProfile): Promise<Profile> {
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db
      .insert(profiles)
      .values({ ...profile, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          displayName: profile.displayName,
          bio: profile.bio,
          location: profile.location,
          website: profile.website,
          avatarUrl: profile.avatarUrl,
          avatarCid: profile.avatarCid,
          ipfsImages: profile.ipfsImages,
          tags: profile.tags,
          isPublic: profile.isPublic,
          orcidId: profile.orcidId,
          orcidName: profile.orcidName,
          ceramicStreamId: profile.ceramicStreamId,
          ceramicDid: profile.ceramicDid,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  }

  async getAllProfiles(): Promise<Profile[]> {
    return db.select().from(profiles).where(eq(profiles.isPublic, true)).orderBy(desc(profiles.points));
  }

  // ── Contributions ─────────────────────────────────────────────────────────
  async getContributions(profileId: string): Promise<Contribution[]> {
    return db
      .select()
      .from(contributions)
      .where(eq(contributions.profileId, profileId))
      .orderBy(desc(contributions.createdAt));
  }

  async addContribution(contribution: InsertContribution): Promise<Contribution> {
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db
      .insert(contributions)
      .values({ ...contribution, id: randomUUID(), createdAt: now })
      .returning();
    // Increment the profile's cached points total
    await db
      .update(profiles)
      .set({ points: sql`${profiles.points} + ${contribution.points}`, updatedAt: now })
      .where(eq(profiles.id, contribution.profileId));
    return row;
  }

  async hasContributionToday(profileId: string, type: string): Promise<boolean> {
    const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const rows = await db
      .select()
      .from(contributions)
      .where(
        sql`${contributions.profileId} = ${profileId}
          AND ${contributions.type} = ${type}
          AND ${contributions.createdAt} >= ${startOfDay}`
      );
    return rows.length > 0;
  }

  // ── ORCID ─────────────────────────────────────────────────────────────────
  async saveOrcid(profileId: string, orcidId: string, orcidName: string): Promise<Profile> {
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db
      .update(profiles)
      .set({ orcidId, orcidName, updatedAt: now })
      .where(eq(profiles.id, profileId))
      .returning();
    return row;
  }

  async clearOrcid(profileId: string): Promise<Profile> {
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db
      .update(profiles)
      .set({ orcidId: null, orcidName: null, updatedAt: now })
      .where(eq(profiles.id, profileId))
      .returning();
    return row;
  }

  // ── Ceramic + IDX ─────────────────────────────────────────────────────────
  async saveCeramic(profileId: string, ceramicStreamId: string, ceramicDid: string): Promise<Profile> {
    const now = Math.floor(Date.now() / 1000);
    const existing = await this.getProfile(profileId);
    if (!existing) {
      const [row] = await db
        .insert(profiles)
        .values({ id: profileId, ceramicStreamId, ceramicDid, createdAt: now, updatedAt: now })
        .returning();
      return row;
    }
    const [row] = await db
      .update(profiles)
      .set({ ceramicStreamId, ceramicDid, updatedAt: now })
      .where(eq(profiles.id, profileId))
      .returning();
    return row;
  }

  // ── Geolocation ───────────────────────────────────────────────────────────
  async saveLocation(profileId: string, latitude: number, longitude: number): Promise<Profile> {
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db
      .update(profiles)
      .set({ latitude, longitude, updatedAt: now })
      .where(eq(profiles.id, profileId))
      .returning();
    return row;
  }

  async getMapMarkers(): Promise<{ id: string; displayName: string; avatarUrl: string; latitude: number; longitude: number; orcidId: string }[]> {
    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        latitude: profiles.latitude,
        longitude: profiles.longitude,
        orcidId: profiles.orcidId,
      })
      .from(profiles)
      .where(eq(profiles.isPublic, true));

    return rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        id: r.id,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        orcidId: r.orcidId,
      }));
  }

  // ── Reef Images ───────────────────────────────────────────────────────────
  async createReefImage(data: InsertReefImage): Promise<ReefImage> {
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db
      .insert(reefImages)
      .values({ ...data, id: randomUUID(), createdAt: now })
      .returning();
    return row;
  }

  async getReefImages(): Promise<ReefImage[]> {
    return db.select().from(reefImages).orderBy(desc(reefImages.createdAt));
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        tags: profiles.tags,
        points: profiles.points,
        createdAt: profiles.createdAt,
        orcidId: profiles.orcidId,
        orcidName: profiles.orcidName,
        questionCount: sql<number>`count(${contributions.id}) filter (where ${contributions.type} = 'question')`,
      })
      .from(profiles)
      .leftJoin(contributions, eq(contributions.profileId, profiles.id))
      .where(eq(profiles.isPublic, true))
      .groupBy(profiles.id)
      .orderBy(desc(profiles.points));

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      tags: r.tags,
      points: r.points,
      questionCount: Number(r.questionCount),
      createdAt: r.createdAt,
      orcidId: r.orcidId,
      orcidName: r.orcidName,
    }));
  }
}

export const storage = new DbStorage();
