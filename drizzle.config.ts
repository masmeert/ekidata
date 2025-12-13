import { defineConfig } from "drizzle-kit";

const DB_URL =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: DB_URL,
	},
});
