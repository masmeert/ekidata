import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Data, Duration, Effect, Schedule } from "effect";

export class ScraperError extends Data.TaggedError("ScraperError")<{
	readonly url: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class ScraperRateLimitError extends Data.TaggedError(
	"ScraperRateLimitError",
)<{
	readonly url: string;
	readonly retryAfter?: number;
}> {}

/** 1 request per 2 seconds = 30 req/min */
const RATE_LIMIT_DELAY = Duration.seconds(2);

/** 3 attempts with exponential backoff starting at 1s */
const retryPolicy = Schedule.intersect(
	Schedule.recurs(3),
	Schedule.exponential(Duration.seconds(1)),
);

class ScraperService extends Effect.Service<ScraperService>()(
	"ScraperService",
	{
		dependencies: [FetchHttpClient.layer],
		effect: Effect.gen(function* () {
			const client = yield* HttpClient.HttpClient;

			const fetchPage = (url: string) =>
				Effect.gen(function* () {
					yield* Effect.log(`Fetching: ${url}`);

					const request = HttpClientRequest.get(url).pipe(
						HttpClientRequest.setHeaders({
							"User-Agent":
								"Mozilla/5.0 (compatible; EkidataBot/1.0; +https://github.com/ekidata)",
							Accept:
								"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
							"Accept-Language": "ja,en;q=0.5",
						}),
					);

					const res = yield* client.execute(request).pipe(
						Effect.retry(retryPolicy),
						Effect.mapError(
							(e) =>
								new ScraperError({
									url,
									message: `Fetch error: ${e instanceof Error ? e.message : String(e)}`,
									cause: e,
								}),
						),
					);

					if (res.status === 429) {
						const retryAfter = res.headers["retry-after"];
						return yield* Effect.fail(
							new ScraperRateLimitError({
								url,
								retryAfter: retryAfter
									? Number.parseInt(String(retryAfter), 10)
									: undefined,
							}),
						);
					}

					const html = yield* res.text.pipe(
						Effect.mapError(
							(e) =>
								new ScraperError({
									url,
									message: `Failed to read response body: ${e.message}`,
									cause: e,
								}),
						),
					);

					yield* Effect.sleep(RATE_LIMIT_DELAY);

					return html;
				});

			const fetchPages = (urls: string[]) =>
				Effect.forEach(urls, fetchPage, { concurrency: 1 });

			return { fetchPage, fetchPages };
		}),
	},
) {}

export { ScraperService };
