import { Schema } from "effect";

import { EntityStatus } from "@/schemas/shared";
import { NullDate, NullNum, NullStr } from "@/schemas/utils";

export const StationCsvSchema = Schema.Struct({
	station_cd: Schema.NumberFromString,
	station_g_cd: Schema.NumberFromString,
	station_name: Schema.String,
	station_name_k: NullStr,
	station_name_r: NullStr,
	name_english: Schema.optional(NullStr),
	name_english_formal: Schema.optional(NullStr),
	line_cd: Schema.NumberFromString,
	pref_cd: Schema.NumberFromString,
	post: NullStr,
	address: NullStr,
	lon: NullNum,
	lat: NullNum,
	open_ymd: NullDate,
	close_ymd: NullDate,
	e_status: EntityStatus,
	e_sort: NullNum,
});

const PointSchema = Schema.Struct({
	x: Schema.Number,
	y: Schema.Number,
});

export const StationDbSchema = Schema.Struct({
	id: Schema.Number,
	groupId: Schema.Number,
	name: Schema.String,
	nameKana: Schema.String,
	nameRomaji: Schema.String,
	nameEn: Schema.NullOr(Schema.String),
	nameEnFormal: Schema.NullOr(Schema.String),
	lineId: Schema.Number,
	prefectureId: Schema.Number,
	postalCode: Schema.NullOr(Schema.String),
	address: Schema.NullOr(Schema.String),
	location: Schema.NullOr(PointSchema),
	openedAt: Schema.NullOr(Schema.String),
	closedAt: Schema.NullOr(Schema.String),
	status: Schema.Literal("active", "pre_opening", "defunct"),
	sort: Schema.NullOr(Schema.Number),
});

export type StationCsv = typeof StationCsvSchema.Type;
export type StationDb = typeof StationDbSchema.Type;
