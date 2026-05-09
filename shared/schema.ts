import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, serial } from "drizzle-orm/pg-core";
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
  // Social links
  twitterHandle: text("twitter_handle").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  githubHandle: text("github_handle").notNull().default(""),
  instagramHandle: text("instagram_handle").notNull().default(""),
  // Wallet / Web3 identity
  walletAddress: text("wallet_address").notNull().default(""),
  // IPFS / Pinata decentralised storage — CID of the pinned profile JSON
  ipfsCid: text("ipfs_cid").default(""),
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
  author: text("author").notNull().default(""),
  description: text("description").notNull().default(""),
  // curation: 'pending' | 'approved' | 'rejected'
  status: text("status").notNull().default("pending"),
  curatedBy: varchar("curated_by"),   // profileId of the ORCID-verified curator
  curatedAt: integer("curated_at"),
  curatorNote: text("curator_note").notNull().default(""),
  profileId: varchar("profile_id"),
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertReefImageSchema = createInsertSchema(reefImages).omit({
  id: true,
  createdAt: true,
  status: true,
  curatedBy: true,
  curatedAt: true,
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

// ─── GCRMN Benthic Monitoring Sites (geocoded, persisted) ─────────────────────
export const gcrmnSites = pgTable("gcrmn_sites", {
  id:       serial("id").primaryKey(),
  lat:      real("lat").notNull(),
  lon:      real("lon").notNull(),
  site:     text("site").notNull().default(""),
  location: text("location").notNull().default(""),
  country:  text("country").notNull().default(""),
});

export const insertGcrmnSiteSchema = createInsertSchema(gcrmnSites).omit({ id: true });
export type InsertGcrmnSite = z.infer<typeof insertGcrmnSiteSchema>;
export type GcrmnSite = typeof gcrmnSites.$inferSelect;

// ─── Reef Videos (IPFS-pinned video surveys with geo-coordinates) ─────────────
export const reefVideos = pgTable("reef_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cid: text("cid").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  title: text("title").notNull().default(""),
  author: text("author").notNull().default(""),
  description: text("description").notNull().default(""),
  durationSecs: integer("duration_secs").default(0),
  depthM: real("depth_m").default(0),
  status: text("status").notNull().default("pending"),
  curatedBy: varchar("curated_by"),
  curatedAt: integer("curated_at"),
  curatorNote: text("curator_note").notNull().default(""),
  profileId: varchar("profile_id"),
  createdAt: integer("created_at").notNull().default(sql`extract(epoch from now())::int`),
});

export const insertReefVideoSchema = createInsertSchema(reefVideos).omit({
  id: true,
  createdAt: true,
  status: true,
  curatedBy: true,
  curatedAt: true,
});
export type InsertReefVideo = z.infer<typeof insertReefVideoSchema>;
export type ReefVideo = typeof reefVideos.$inferSelect;

// ─── Leaderboard (aggregated view) ────────────────────────────────────────────
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl: string;
  avatarCid: string;
  tags: string[];
  points: number;
  questionCount: number;
  createdAt: number;
  orcidId: string;
  orcidName: string;
  // Extended community visibility fields
  ipfsCid: string;
  walletAddress: string;
  twitterHandle: string;
  githubHandle: string;
  linkedinUrl: string;
  instagramHandle: string;
  bio: string;
  location: string;
  website: string;
}
