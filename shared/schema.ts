import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const prelaunchSignups = pgTable("prelaunch_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  consent: boolean("consent").notNull().default(true),
  source: text("source").notNull(),
});

export const insertPrelaunchSignupSchema = createInsertSchema(prelaunchSignups).omit({
  id: true,
});

export type InsertPrelaunchSignup = z.infer<typeof insertPrelaunchSignupSchema>;
export type PrelaunchSignup = typeof prelaunchSignups.$inferSelect;
