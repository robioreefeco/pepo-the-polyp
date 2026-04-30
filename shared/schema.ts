import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Legacy users table (kept for compatibility) ──────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Profiles ─────────────────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(), // Privy user ID
  displayName: text("display_name").notNull().default("Explorer"),
  bio: text("bio").notNull().default(""),
  location: text("location").notNull().default(""),
  website: text("website").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  points: integer("points").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  orcidId: text("orcid_id").notNull().default(""),
  orcidName: text("orcid_name").notNull().default(""),
  // Ceramic + IDX decentralized storage
  ceramicStreamId: text("ceramic_stream_id").default(""),
  ceramicDid: text("ceramic_did").default(""),
  // IPFS
  avatarCid: text("avatar_cid").default(""),
  ipfsImages: text("ipfs_images").array().notNull().default(sql`'{}'::text[]`),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer("updated_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// ─── Contributions ────────────────────────────────────────────────────────────
export const contributions = pgTable("contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id),
  type: text("type").notNull(), // 'question' | 'answer' | 'resource' | 'login'
  description: text("description").notNull().default(""),
  points: integer("points").notNull().default(10),
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertContributionSchema = createInsertSchema(contributions).omit({
  id: true,
  createdAt: true,
});
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Contribution = typeof contributions.$inferSelect;

// ─── Reef Images (IPFS-pinned images with geo-coordinates) ────────────────────
export const reefImages = pgTable("reef_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cid: text("cid").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  title: text("title").notNull().default(""),
  profileId: varchar("profile_id"),
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertReefImageSchema = createInsertSchema(reefImages).omit({
  id: true,
  createdAt: true,
});
export type InsertReefImage = z.infer<typeof insertReefImageSchema>;
export type ReefImage = typeof reefImages.$inferSelect;

// ─── IPFS Blocks (DB-persisted content for production durability) ─────────────
export const ipfsBlocks = pgTable("ipfs_blocks", {
  cid: text("cid").primaryKey(),
  data: text("data").notNull(),           // base64-encoded raw bytes
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  uploadedAt: integer("uploaded_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertIpfsBlockSchema = createInsertSchema(ipfsBlocks).omit({ uploadedAt: true });
export type InsertIpfsBlock = z.infer<typeof insertIpfsBlockSchema>;
export type IpfsBlock = typeof ipfsBlocks.$inferSelect;

// ─── Leaderboard (aggregated view) ────────────────────────────────────────────
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl: string;
  tags: string[];
  points: number;
  questionCount: number;
  createdAt: number;
  orcidId: string;
  orcidName: string;
}
