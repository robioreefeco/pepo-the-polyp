import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
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
