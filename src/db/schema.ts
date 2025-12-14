import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	geometry,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	uuid,
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

export const stampStatusEnum = pgEnum("stamp_status", [
	"available", // 設置中
	"discontinued", // 廃止
	"limited", // 期間限定
]);

export const stampShapeEnum = pgEnum("stamp_shape", [
	"circle", // 円形
	"square", // 四角形
	"hexagon", // 六角形
	"pentagon", // 五角形
	"other",
]);

export const region = pgTable("region", {
	id: varchar({ length: 16 }).primaryKey(),
	name: varchar({ length: 32 }).notNull(),
	nameEn: varchar("name_en", { length: 32 }).notNull(),
});

export const prefecture = pgTable("prefecture", {
	id: smallint().primaryKey(), // JIS code 1-47
	name: varchar({ length: 16 }).notNull(),
	nameKana: varchar("name_kana", { length: 32 }),
	nameEn: varchar("name_en", { length: 32 }).notNull(),
	regionId: varchar("region_id", { length: 16 })
		.notNull()
		.references(() => region.id),
});

export const company = pgTable("company", {
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

export const line = pgTable(
	"line",
	{
		id: integer().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => company.id),
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
	(t) => [index("line_location_idx").using("gist", t.location)],
);

export const station = pgTable(
	"station",
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
			.references(() => line.id),
		prefectureId: smallint("prefecture_id")
			.notNull()
			.references(() => prefecture.id),
		postalCode: varchar("postal_code", { length: 16 }),
		address: text(),
		location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
		openedOn: date("opened_on"),
		closedOn: date("closed_on"),
		status: entityStatusEnum().notNull().default("active"),
		sortOrder: integer("sort_order"),
	},
	(t) => [index("station_location_idx").using("gist", t.location)],
);

export const stampRally = pgTable("stamp_rally", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar({ length: 255 }).notNull(),
	nameEn: varchar("name_en", { length: 255 }),
	startDate: date("start_date"),
	endDate: date("end_date"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const stampRallyOrganizer = pgTable(
	"stamp_rally_organizer",
	{
		rallyId: uuid("rally_id")
			.notNull()
			.references(() => stampRally.id, { onDelete: "cascade" }),
		companyId: integer("company_id")
			.notNull()
			.references(() => company.id, { onDelete: "cascade" }),
	},
	(t) => [
		primaryKey({ columns: [t.rallyId, t.companyId] }),
		index("stamp_rally_organizer_rally_id_idx").on(t.rallyId),
		index("stamp_rally_organizer_company_id_idx").on(t.companyId),
	],
);

export const stamp = pgTable(
	"stamp",
	{
		id: uuid().primaryKey().defaultRandom(),
		stationId: integer("station_id").references(() => station.id),
		rallyId: uuid("rally_id").references(() => stampRally.id),
		name: varchar({ length: 255 }).notNull(),
		nameEn: varchar("name_en", { length: 255 }),
		description: text(),
		descriptionEn: text("description_en"),
		locationName: varchar("location_name", { length: 255 }),
		locationNameEn: varchar("location_name_en", { length: 255 }),
		locationNote: text("location_note"),
		locationNoteEn: text("location_note_en"),
		shape: stampShapeEnum(),
		sizeCm: varchar("size_cm", { length: 32 }),
		color: varchar({ length: 32 }),
		colorEn: varchar("color_en", { length: 32 }),
		status: stampStatusEnum().notNull().default("available"),
		availableFrom: date("available_from"),
		availableUntil: date("available_until"),
		imageUrl: varchar("image_url", { length: 512 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("stamp_station_id_idx").on(t.stationId),
		index("stamp_rally_id_idx").on(t.rallyId),
	],
);

// Auth tables

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
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
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations - Domain tables

export const regionRelations = relations(region, ({ many }) => ({
	prefecture: many(prefecture),
}));

export const prefectureRelations = relations(
	prefecture,
	({ one, many }) => ({
		region: one(region, {
			fields: [prefecture.regionId],
			references: [region.id],
		}),
		station: many(station),
	}),
);

export const companyRelations = relations(company, ({ many }) => ({
	line: many(line),
	stampRallyOrganizer: many(stampRallyOrganizer),
}));

export const lineRelations = relations(line, ({ one, many }) => ({
	company: one(company, {
		fields: [line.companyId],
		references: [company.id],
	}),
	station: many(station),
}));

export const stationRelations = relations(station, ({ one, many }) => ({
	line: one(line, {
		fields: [station.lineId],
		references: [line.id],
	}),
	prefecture: one(prefecture, {
		fields: [station.prefectureId],
		references: [prefecture.id],
	}),
	stamp: many(stamp),
}));

export const stampRallyRelations = relations(stampRally, ({ many }) => ({
	stamp: many(stamp),
	organizers: many(stampRallyOrganizer),
}));

export const stampRallyOrganizerRelations = relations(
	stampRallyOrganizer,
	({ one }) => ({
		rally: one(stampRally, {
			fields: [stampRallyOrganizer.rallyId],
			references: [stampRally.id],
		}),
		company: one(company, {
			fields: [stampRallyOrganizer.companyId],
			references: [company.id],
		}),
	}),
);

export const stampRelations = relations(stamp, ({ one }) => ({
	station: one(station, {
		fields: [stamp.stationId],
		references: [station.id],
	}),
	rally: one(stampRally, {
		fields: [stamp.rallyId],
		references: [stampRally.id],
	}),
}));

// Relations - Auth tables

export const userRelations = relations(user, ({ many }) => ({
	account: many(account),
	session: many(session),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));
