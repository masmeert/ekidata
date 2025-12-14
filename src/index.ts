import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";

import { schema } from "@/db";
import {
	parseCompanies,
	parseLines,
	parsePrefectures,
	parseRegions,
	parseStations,
} from "@/parsing/parsers";
import { CsvService } from "@/services/csv";
import { DrizzleService } from "@/services/drizzle";
import { KuroshiroService } from "@/services/kuroshiro";

const seed = Effect.gen(function* () {
	const db = yield* DrizzleService;
	const dir = "./src/data";

	// Clear tables
	yield* Effect.log("Clearing existing data...");
	yield* Effect.promise(() => db.delete(schema.station));
	yield* Effect.promise(() => db.delete(schema.line));
	yield* Effect.promise(() => db.delete(schema.company));
	yield* Effect.promise(() => db.delete(schema.prefecture));
	yield* Effect.promise(() => db.delete(schema.region));

	yield* Effect.log("Parsing regions...");
	const regionData = yield* parseRegions(dir);
	yield* Effect.promise(() => db.insert(schema.region).values(regionData));
	yield* Effect.log(`Inserted ${regionData.length} regions`);

	yield* Effect.log("Parsing prefectures...");
	const prefectureData = yield* parsePrefectures(dir);
	yield* Effect.promise(() =>
		db.insert(schema.prefecture).values(prefectureData),
	);
	yield* Effect.log(`Inserted ${prefectureData.length} prefectures`);

	yield* Effect.log("Parsing companies...");
	const companyData = yield* parseCompanies(dir);
	yield* Effect.promise(() => db.insert(schema.company).values(companyData));
	yield* Effect.log(`Inserted ${companyData.length} companies`);

	yield* Effect.log("Parsing lines...");
	const lineData = yield* parseLines(dir);
	yield* Effect.promise(() => db.insert(schema.line).values(lineData));
	yield* Effect.log(`Inserted ${lineData.length} lines`);

	const validLineIds = new Set(lineData.map((l) => l.id));
	yield* Effect.log("Parsing stations...");
	const allStations = yield* parseStations(dir);
	const stationData = allStations.filter((s) => validLineIds.has(s.lineId));
	yield* Effect.log(
		`Filtered ${allStations.length - stationData.length} stations with missing line references`,
	);

	const batchSize = 1000;
	for (let i = 0; i < stationData.length; i += batchSize) {
		const batch = stationData.slice(i, i + batchSize);
		yield* Effect.promise(() => db.insert(schema.station).values(batch));
		yield* Effect.log(
			`Inserted ${Math.min(i + batchSize, stationData.length)}/${stationData.length} stations`,
		);
	}

	yield* Effect.log("Seeding complete!");
});

const AllServices = Layer.mergeAll(
	CsvService.Default,
	KuroshiroService.Default,
	DrizzleService.Default,
);

BunRuntime.runMain(seed.pipe(Effect.provide(AllServices)));
