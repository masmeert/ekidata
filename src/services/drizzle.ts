import * as DrizzlePg from "@effect/sql-drizzle/Pg";
import { Effect } from "effect";

import * as schema from "@/db";
import { PgLive } from "@/services/db";

export class DrizzleService extends Effect.Service<DrizzleService>()(
	"DrizzleService",
	{
		dependencies: [PgLive],
		effect: Effect.gen(function* () {
			const db = yield* DrizzlePg.make<typeof schema>({
				schema,
			});
			return db;
		}),
	},
) {}
