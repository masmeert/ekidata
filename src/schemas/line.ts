import { Schema } from "effect";

import { EntityStatus } from "@/schemas/shared";
import { NullNum, NullStr } from "@/schemas/utils";

export const LineCsvSchema = Schema.Struct({
	line_cd: Schema.NumberFromString,
	company_cd: Schema.NumberFromString,
	line_name: Schema.String,
	line_name_k: NullStr,
	line_name_r: Schema.optional(NullStr),
	line_name_h: NullStr,
	line_name_en: Schema.optional(NullStr),
	line_name_en_formal: Schema.optional(NullStr),
	line_color_c: NullStr,
	line_color_t: NullStr,
	line_type: NullNum,
	lon: NullNum,
	lat: NullNum,
	zoom: NullNum,
	e_status: EntityStatus,
	e_sort: NullNum,
});

const PointSchema = Schema.Struct({
	x: Schema.Number,
	y: Schema.Number,
});

export const LineDbSchema = Schema.Struct({
	id: Schema.Number,
	companyId: Schema.Number,
	name: Schema.String,
	nameKana: Schema.String,
	nameRomaji: Schema.String,
	nameHira: Schema.NullOr(Schema.String),
	nameEn: Schema.NullOr(Schema.String),
	nameEnFormal: Schema.NullOr(Schema.String),
	colorCode: Schema.NullOr(Schema.String),
	colorText: Schema.NullOr(Schema.String),
	type: Schema.NullOr(Schema.Number),
	location: Schema.NullOr(PointSchema),
	zoom: Schema.NullOr(Schema.Number),
	status: Schema.Literal("active", "pre_opening", "defunct"),
	sort: Schema.NullOr(Schema.Number),
});

export type LineCsv = typeof LineCsvSchema.Type;
export type LineDb = typeof LineDbSchema.Type;
