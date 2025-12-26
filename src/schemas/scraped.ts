import { Schema } from "effect";

export const ScrapedStampStatus = Schema.Literal(
	"available",
	"discontinued",
	"limited",
);

export const ScrapedCoordinates = Schema.Struct({
	lat: Schema.Number,
	lon: Schema.Number,
});

export const ScrapedLocationInfo = Schema.Struct({
	name: Schema.String,
	nameKana: Schema.NullOr(Schema.String),
	nameEn: Schema.NullOr(Schema.String),
	address: Schema.NullOr(Schema.String),
	postalCode: Schema.NullOr(Schema.String),
	coordinates: Schema.NullOr(ScrapedCoordinates),
	companyName: Schema.NullOr(Schema.String),
	lineName: Schema.NullOr(Schema.String),
	pageUrl: Schema.String,
});

export const ScrapedStamp = Schema.Struct({
	title: Schema.String,
	description: Schema.NullOr(Schema.String),
	locationNote: Schema.NullOr(Schema.String),
	size: Schema.NullOr(Schema.String),
	color: Schema.NullOr(Schema.String),
	imageUrl: Schema.NullOr(Schema.String),
	status: ScrapedStampStatus,
	availableFrom: Schema.NullOr(Schema.String),
	availableUntil: Schema.NullOr(Schema.String),
	stampedDate: Schema.NullOr(Schema.String),
});

export const ScrapedPage = Schema.Struct({
	location: ScrapedLocationInfo,
	stamps: Schema.Array(ScrapedStamp),
});

export type ScrapedStampStatus = typeof ScrapedStampStatus.Type;
export type ScrapedCoordinates = typeof ScrapedCoordinates.Type;
export type ScrapedLocationInfo = typeof ScrapedLocationInfo.Type;
export type ScrapedStamp = typeof ScrapedStamp.Type;
export type ScrapedPage = typeof ScrapedPage.Type;
