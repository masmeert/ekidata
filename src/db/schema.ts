import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	geometry,
	index,
	integer,
	pgEnum,
	pgTable,
	smallint,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const entityStatusEnum = pgEnum("entity_status", [
	"active",
	"pre_opening",
	"defunct",
]);

export const companyTypeEnum = pgEnum("company_type", [
	"other",
	"jr",
	"major_private",
	"semi_major",
]);

export const regionsTable = pgTable("regions", {
	id: varchar({ length: 16 }).primaryKey(),
	name: varchar({ length: 32 }).notNull(),
	nameEn: varchar("name_en", { length: 32 }).notNull(),
});

export const prefecturesTable = pgTable("prefectures", {
	id: smallint().primaryKey(), // JIS code 1-47
	name: varchar({ length: 16 }).notNull(),
	nameKana: varchar("name_kana", { length: 32 }),
	nameEn: varchar("name_en", { length: 32 }).notNull(),
	regionId: varchar("region_id", { length: 16 })
		.notNull()
		.references(() => regionsTable.id),
});

export const companiesTable = pgTable("companies", {
	id: integer().primaryKey(),
	railwayCategoryId: smallint("railway_category_id"),
	name: varchar({ length: 256 }).notNull(),
	nameKana: varchar("name_kana", { length: 256 }),
	nameFormal: varchar("name_formal", { length: 256 }),
	nameRomaji: varchar("name_romaji", { length: 256 }),
	nameEn: varchar("name_en", { length: 256 }),
	nameEnFormal: varchar("name_en_formal", { length: 256 }),
	websiteUrl: varchar("website_url", { length: 512 }),
	type: companyTypeEnum().notNull().default("other"),
	status: entityStatusEnum().notNull().default("active"),
	sortOrder: integer("sort_order"),
});

export const linesTable = pgTable(
	"lines",
	{
		id: integer().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => companiesTable.id),
		name: varchar({ length: 256 }).notNull(),
		nameKana: varchar("name_kana", { length: 256 }),
		nameFormal: varchar("name_formal", { length: 256 }),
		nameEn: varchar("name_en", { length: 256 }),
		nameEnFormal: varchar("name_en_formal", { length: 256 }),
		colorHex: varchar("color_hex", { length: 8 }),
		colorName: varchar("color_name", { length: 64 }),
		type: smallint(),
		location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
		mapZoom: smallint("map_zoom"),
		status: entityStatusEnum().notNull().default("active"),
		sortOrder: integer("sort_order"),
	},
	(t) => [index("lines_location_idx").using("gist", t.location)],
);

export const stationsTable = pgTable(
	"stations",
	{
		id: integer().primaryKey(),
		groupId: integer("group_id").notNull(),
		name: varchar({ length: 256 }).notNull(),
		nameKana: varchar("name_kana", { length: 256 }),
		nameRomaji: varchar("name_romaji", { length: 256 }),
		nameEn: varchar("name_en", { length: 256 }),
		nameEnFormal: varchar("name_en_formal", { length: 256 }),
		lineId: integer("line_id")
			.notNull()
			.references(() => linesTable.id),
		prefectureId: smallint("prefecture_id")
			.notNull()
			.references(() => prefecturesTable.id),
		postalCode: varchar("postal_code", { length: 16 }),
		address: text(),
		location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
		openedOn: date("opened_on"),
		closedOn: date("closed_on"),
		status: entityStatusEnum().notNull().default("active"),
		sortOrder: integer("sort_order"),
	},
	(t) => [index("stations_location_idx").using("gist", t.location)],
);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));
