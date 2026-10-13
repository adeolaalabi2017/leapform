import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const forms = pgTable("forms", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled form"),
  /** "draft" | "published" */
  status: text("status").notNull().default("draft"),
  draftSchema: jsonb("draft_schema").$type<unknown>().notNull(),
  publishedSchema: jsonb("published_schema").$type<unknown>(),
  theme: jsonb("theme").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const responses = pgTable("responses", {
  id: text("id").primaryKey(),
  formId: text("form_id")
    .notNull()
    .references(() => forms.id, { onDelete: "cascade" }),
  /** Record<fieldId, value> */
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
  completed: boolean("completed").notNull().default(true),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FormRow = typeof forms.$inferSelect;
export type ResponseRow = typeof responses.$inferSelect;
