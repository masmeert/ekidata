import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { Effect } from "effect";

import { scrapeJob } from "@/db/schema";
import { DrizzleService } from "@/services/drizzle";

const MAX_ATTEMPTS = 3;
const RESCRAPE_AFTER_DAYS = 30;

export class ScrapeJobService extends Effect.Service<ScrapeJobService>()(
	"ScrapeJobService",
	{
		dependencies: [DrizzleService.Default],
		effect: Effect.gen(function* () {
			const db = yield* DrizzleService;

			const upsertUrls = (urls: string[]) =>
				Effect.gen(function* () {
					if (urls.length === 0) return [];

					const result = yield* Effect.promise(() =>
						db
							.insert(scrapeJob)
							.values(urls.map((url) => ({ url })))
							.onConflictDoNothing({ target: scrapeJob.url })
							.returning(),
					);

					yield* Effect.log(
						`Upserted ${urls.length} URLs, ${result.length} new`,
					);
					return result;
				});

			const getPendingJobs = (limit = 10) =>
				Effect.promise(() => {
					const now = new Date();
					return db
						.select()
						.from(scrapeJob)
						.where(
							and(
								or(
									eq(scrapeJob.status, "pending"),
									and(
										eq(scrapeJob.status, "failed"),
										lt(scrapeJob.attemptCount, MAX_ATTEMPTS),
									),
								),
								or(
									isNull(scrapeJob.nextScrapeAt),
									lt(scrapeJob.nextScrapeAt, now),
								),
							),
						)
						.orderBy(scrapeJob.createdAt)
						.limit(limit);
				});

			const getJobsDueForRescrape = (limit = 10) =>
				Effect.promise(() => {
					const cutoff = new Date();
					cutoff.setDate(cutoff.getDate() - RESCRAPE_AFTER_DAYS);
					return db
						.select()
						.from(scrapeJob)
						.where(
							and(
								eq(scrapeJob.status, "completed"),
								lt(scrapeJob.lastScrapedAt, cutoff),
							),
						)
						.orderBy(scrapeJob.lastScrapedAt)
						.limit(limit);
				});

			const markInProgress = (id: string) =>
				Effect.promise(() =>
					db
						.update(scrapeJob)
						.set({
							status: "in_progress",
							attemptCount: sql`${scrapeJob.attemptCount} + 1`,
						})
						.where(eq(scrapeJob.id, id))
						.returning(),
				);

			const markCompleted = (id: string, data: string) =>
				Effect.promise(() =>
					db
						.update(scrapeJob)
						.set({
							status: "completed",
							lastScrapedAt: new Date(),
							scrapedData: data,
							errorMessage: null,
						})
						.where(eq(scrapeJob.id, id))
						.returning(),
				);

			const markFailed = (id: string, error: string) =>
				Effect.gen(function* () {
					const [job] = yield* Effect.promise(() =>
						db
							.update(scrapeJob)
							.set({
								status: "failed",
								errorMessage: error,
								nextScrapeAt: getBackoffTime(),
							})
							.where(eq(scrapeJob.id, id))
							.returning(),
					);

					if (job && job.attemptCount >= MAX_ATTEMPTS) {
						yield* Effect.log(
							`Job ${id} exceeded max attempts (${MAX_ATTEMPTS}), giving up`,
						);
					}

					return job;
				});

			const resetForRescrape = (id: string) =>
				Effect.promise(() =>
					db
						.update(scrapeJob)
						.set({
							status: "pending",
							attemptCount: 0,
							errorMessage: null,
							nextScrapeAt: null,
						})
						.where(eq(scrapeJob.id, id))
						.returning(),
				);

			const getStats = () =>
				Effect.promise(() =>
					db
						.select({
							status: scrapeJob.status,
							count: sql<number>`count(*)::int`,
						})
						.from(scrapeJob)
						.groupBy(scrapeJob.status),
				);

			return {
				upsertUrls,
				getPendingJobs,
				getJobsDueForRescrape,
				markInProgress,
				markCompleted,
				markFailed,
				resetForRescrape,
				getStats,
			};
		}),
	},
) {}

function getBackoffTime(): Date {
	const backoff = new Date();
	backoff.setMinutes(backoff.getMinutes() + 5);
	return backoff;
}
