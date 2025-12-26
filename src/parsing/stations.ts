import { ilike, or, sql } from "drizzle-orm";
import { Array as A, Effect, pipe } from "effect";

import { station } from "@/db/schema";
import type { StationMapped } from "@/parsing/mappers";
import type { ScrapedLocationInfo } from "@/schemas/scraped";
import type { StationDb, StationLineDb } from "@/schemas/station";
import { DrizzleService } from "@/services/drizzle";

export type DeduplicatedStations = {
	stations: StationDb[];
	stationLines: StationLineDb[];
};

export const deduplicateStations = (
	mapped: StationMapped[],
	validLineIds: Set<number>,
) =>
	Effect.gen(function* () {
		const valid = mapped.filter((m) => validLineIds.has(m.stationLine.lineId));

		const stations = pipe(
			valid,
			A.map((m) => m.station),
			A.dedupeWith((a, b) => a.id === b.id),
		);

		const stationLines = pipe(
			valid,
			A.map((m) => m.stationLine),
			A.dedupeWith(
				(a, b) => a.stationId === b.stationId && a.lineId === b.lineId,
			),
		);

		const filtered = mapped.length - stationLines.length;

		yield* Effect.log(`Filtered ${filtered} with missing/duplicate lines`);
		yield* Effect.log(
			`Deduplicated to ${stations.length} stations, ${stationLines.length} station-line links`,
		);

		return { stations, stationLines } satisfies DeduplicatedStations;
	});

export interface MatchResult {
	stationId: number | null;
	matchType: "exact_name" | "fuzzy_name" | "coordinates" | "none";
	confidence: number;
	matchedName?: string;
}

const COORDINATE_THRESHOLD_KM = 0.5;

const extractStationName = (fullName: string): string => {
	return fullName
		.replace(/^(JR|国鉄|私鉄)/, "")
		.replace(/駅$/, "")
		.replace(/（.+）$/, "")
		.trim();
};

export class StationMatcher extends Effect.Service<StationMatcher>()(
	"StationMatcher",
	{
		dependencies: [DrizzleService.Default],
		effect: Effect.gen(function* () {
			const db = yield* DrizzleService;

			const findByExactName = (name: string) =>
				Effect.promise(() => {
					const cleanName = extractStationName(name);
					return db
						.select({
							id: station.id,
							name: station.name,
							prefectureId: station.prefectureId,
						})
						.from(station)
						.where(sql`${station.name} = ${cleanName}`)
						.limit(5);
				});

			const findByFuzzyName = (name: string) =>
				Effect.promise(() => {
					const cleanName = extractStationName(name);
					return db
						.select({
							id: station.id,
							name: station.name,
							prefectureId: station.prefectureId,
						})
						.from(station)
						.where(
							or(
								ilike(station.name, `%${cleanName}%`),
								ilike(station.nameKana, `%${cleanName}%`),
							),
						)
						.limit(10);
				});

			const findByCoordinates = (lat: number, lon: number) =>
				Effect.promise(() =>
					db
						.select({
							id: station.id,
							name: station.name,
							prefectureId: station.prefectureId,
							distance: sql<number>`ST_Distance(
								location::geography,
								ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
							) / 1000`.as("distance_km"),
						})
						.from(station)
						.where(
							sql`ST_DWithin(
								location::geography,
								ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
								${COORDINATE_THRESHOLD_KM * 1000}
							)`,
						)
						.orderBy(
							sql`ST_Distance(
								location::geography,
								ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
							)`,
						)
						.limit(5),
				);

			const matchStation = (
				location: ScrapedLocationInfo,
			): Effect.Effect<MatchResult> =>
				Effect.gen(function* () {
					const exactMatches = yield* findByExactName(location.name);
					const [exactFirst] = exactMatches;
					if (exactMatches.length === 1 && exactFirst) {
						return {
							stationId: exactFirst.id,
							matchType: "exact_name" as const,
							confidence: 1.0,
							matchedName: exactFirst.name,
						};
					}

					if (exactMatches.length > 1 && location.coordinates) {
						const coordMatches = yield* findByCoordinates(
							location.coordinates.lat,
							location.coordinates.lon,
						);
						const matchingId = exactMatches.find((e) =>
							coordMatches.some((c) => c.id === e.id),
						);
						if (matchingId) {
							return {
								stationId: matchingId.id,
								matchType: "exact_name" as const,
								confidence: 0.95,
								matchedName: matchingId.name,
							};
						}
					}

					if (location.coordinates) {
						const coordMatches = yield* findByCoordinates(
							location.coordinates.lat,
							location.coordinates.lon,
						);
						const [closest] = coordMatches;
						if (closest) {
							const confidence = Math.max(
								0.5,
								1 - (closest.distance ?? 0) / COORDINATE_THRESHOLD_KM,
							);
							return {
								stationId: closest.id,
								matchType: "coordinates" as const,
								confidence,
								matchedName: closest.name,
							};
						}
					}

					const fuzzyMatches = yield* findByFuzzyName(location.name);
					const [fuzzyFirst] = fuzzyMatches;
					if (fuzzyMatches.length === 1 && fuzzyFirst) {
						return {
							stationId: fuzzyFirst.id,
							matchType: "fuzzy_name" as const,
							confidence: 0.7,
							matchedName: fuzzyFirst.name,
						};
					}

					return {
						stationId: null,
						matchType: "none" as const,
						confidence: 0,
					};
				});

			return { matchStation, findByExactName, findByCoordinates };
		}),
	},
) {}
