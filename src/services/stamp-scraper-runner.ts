import type { Schedule } from "effect";
import { Effect } from "effect";

import { fetchLineIndex, fetchStampPage } from "@/parsing/stamp-scraper";
import { HtmlParserService } from "@/services/html-parser";
import { ScrapeJobService } from "@/services/scrape-job";
import { ScraperService } from "@/services/scraper";

export class StampScraperRunner extends Effect.Service<StampScraperRunner>()(
	"StampScraperRunner",
	{
		dependencies: [
			ScraperService.Default,
			HtmlParserService.Default,
			ScrapeJobService.Default,
		],
		effect: Effect.gen(function* () {
			const jobService = yield* ScrapeJobService;

			const discoverUrls = (lineUrl: string) =>
				Effect.gen(function* () {
					yield* Effect.log(`Discovering URLs from: ${lineUrl}`);
					const urls = yield* fetchLineIndex(lineUrl);
					yield* jobService.upsertUrls(urls);
					yield* Effect.log(`Discovered ${urls.length} station pages`);
					return urls;
				});

			const processJob = (job: { id: string; url: string }) =>
				Effect.gen(function* () {
					yield* Effect.log(`Processing job: ${job.url}`);
					yield* jobService.markInProgress(job.id);

					const result = yield* fetchStampPage(job.url).pipe(
						Effect.map((page) => JSON.stringify(page)),
						Effect.tapError((e) =>
							jobService.markFailed(job.id, String(e.message ?? e)),
						),
					);

					yield* jobService.markCompleted(job.id, result);
					yield* Effect.log(`Completed job: ${job.url}`);
					return result;
				});

			const runBatch = (batchSize = 10) =>
				Effect.gen(function* () {
					const jobs = yield* jobService.getPendingJobs(batchSize);

					if (jobs.length === 0) {
						yield* Effect.log("No pending jobs");
						return [];
					}

					yield* Effect.log(`Processing ${jobs.length} jobs`);

					const results = yield* Effect.forEach(
						jobs,
						(job) =>
							processJob(job).pipe(Effect.catchAll(() => Effect.succeed(null))),
						{ concurrency: 1 },
					);

					return results.filter(Boolean);
				});

			const runUntilEmpty = () =>
				Effect.gen(function* () {
					let totalProcessed = 0;

					while (true) {
						const results = yield* runBatch(10);
						if (results.length === 0) break;
						totalProcessed += results.length;
					}

					yield* Effect.log(`Finished processing ${totalProcessed} jobs`);
					return totalProcessed;
				});

			const runWithSchedule = (cronSchedule: Schedule.Schedule<unknown>) =>
				Effect.gen(function* () {
					yield* Effect.log("Starting scheduled scraper...");
					yield* runUntilEmpty().pipe(Effect.repeat(cronSchedule));
				});

			const getStats = () =>
				Effect.gen(function* () {
					const stats = yield* jobService.getStats();
					yield* Effect.log("Job stats:");
					for (const stat of stats) {
						yield* Effect.log(`  ${stat.status}: ${stat.count}`);
					}
					return stats;
				});

			return {
				discoverUrls,
				processJob,
				runBatch,
				runUntilEmpty,
				runWithSchedule,
				getStats,
			};
		}),
	},
) {}
