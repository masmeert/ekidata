import { FileSystem } from "@effect/platform";
import { BunFileSystem } from "@effect/platform-bun";
import { Data, Effect, pipe, Schema } from "effect";
import Papa from "papaparse";

export class CsvParseError extends Data.TaggedError("CsvParseError")<{
	readonly message: string;
	readonly row?: number;
}> {}

export class CsvFileNotFoundError extends Data.TaggedError(
	"CsvFileNotFoundError",
)<{
	readonly path: string;
}> {}

export class CsvValidationError extends Data.TaggedError("CsvValidationError")<{
	readonly message: string;
	readonly row: number;
	readonly data: Record<string, string>;
}> {}

class CsvService extends Effect.Service<CsvService>()("CsvService", {
	dependencies: [BunFileSystem.layer],
	effect: Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const parseFile = <A, I>(path: string, schema: Schema.Schema<A, I>) =>
			pipe(
				fs.readFileString(path),
				Effect.mapError(() => new CsvFileNotFoundError({ path })),
				Effect.flatMap((content) =>
					Effect.gen(function* () {
						const result = Papa.parse(content, {
							header: true,
							skipEmptyLines: true,
							dynamicTyping: false,
						});

						const firstError = result.errors[0];
						if (firstError) {
							return yield* Effect.fail(
								new CsvParseError({
									message: firstError.message,
									row: firstError.row,
								}),
							);
						}

						return yield* Effect.forEach(result.data, (row, index) =>
							pipe(
								Schema.decodeUnknown(schema)(row),
								Effect.mapError(
									(e) =>
										new CsvValidationError({
											message: e.message,
											row: index,
											data: row as Record<string, string>,
										}),
								),
							),
						);
					}),
				),
			);

		return { parseFile };
	}),
}) {}

export { CsvService };
