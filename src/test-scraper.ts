import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";

import { normalizeStamps } from "@/parsing/mappers";
import { fetchStampPage } from "@/parsing/stamp-scraper";
import { StationMatcher } from "@/parsing/stations";
import { DrizzleService } from "@/services/drizzle";
import { HtmlParserService } from "@/services/html-parser";
import { ScraperService } from "@/services/scraper";

const testWithoutDb = Effect.gen(function* () {
	const testUrl = "https://stamp.funakiya.com/jr-horonobe.html";

	yield* Effect.log("Testing single page scrape (no DB)...");
	const result = yield* fetchStampPage(testUrl);

	yield* Effect.log("\n=== Location Info ===");
	yield* Effect.log(`  Name: ${result.location.name}`);
	yield* Effect.log(`  Name (kana): ${result.location.nameKana}`);
	yield* Effect.log(`  Name (EN): ${result.location.nameEn}`);
	yield* Effect.log(`  Address: ${result.location.address}`);
	yield* Effect.log(`  Coords: ${JSON.stringify(result.location.coordinates)}`);

	const normalized = normalizeStamps(result.stamps);

	yield* Effect.log(`\n=== Found ${normalized.length} stamps (normalized) ===`);
	for (const stamp of normalized) {
		yield* Effect.log(`  - ${stamp.title}`);
		yield* Effect.log(`    Status: ${stamp.status}, Shape: ${stamp.shape}`);
		yield* Effect.log(`    Color: ${stamp.color} → ${stamp.colorEn}`);
	}
});

const testWithDb = Effect.gen(function* () {
	const testUrl = "https://stamp.funakiya.com/jr-horonobe.html";

	yield* Effect.log("Testing with station matching (requires DB)...");
	const result = yield* fetchStampPage(testUrl);

	yield* Effect.log("\n=== Location Info ===");
	yield* Effect.log(`  Name: ${result.location.name}`);
	yield* Effect.log(`  Coords: ${JSON.stringify(result.location.coordinates)}`);

	yield* Effect.log("\n=== Station Matching ===");
	const matcher = yield* StationMatcher;
	const matchResult = yield* matcher.matchStation(result.location);

	yield* Effect.log(`  Match type: ${matchResult.matchType}`);
	yield* Effect.log(
		`  Confidence: ${(matchResult.confidence * 100).toFixed(0)}%`,
	);
	yield* Effect.log(`  Station ID: ${matchResult.stationId}`);
	yield* Effect.log(`  Matched name: ${matchResult.matchedName ?? "N/A"}`);

	const normalized = normalizeStamps(result.stamps);
	yield* Effect.log(
		`\n=== ${normalized.length} stamps ready for insertion ===`,
	);
});

const useDb = process.argv.includes("--db");

const ScraperLayer = Layer.mergeAll(
	ScraperService.Default,
	HtmlParserService.Default,
);

const FullLayer = Layer.mergeAll(
	ScraperLayer,
	StationMatcher.Default,
	DrizzleService.Default,
);

if (useDb) {
	BunRuntime.runMain(testWithDb.pipe(Effect.provide(FullLayer)));
} else {
	BunRuntime.runMain(testWithoutDb.pipe(Effect.provide(ScraperLayer)));
}
