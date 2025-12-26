CREATE TYPE "public"."scrape_job_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "scrape_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" varchar(512) NOT NULL,
	"status" "scrape_job_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" smallint DEFAULT 0 NOT NULL,
	"last_scraped_at" timestamp,
	"next_scrape_at" timestamp,
	"error_message" text,
	"scraped_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scrape_job_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE INDEX "scrape_job_status_idx" ON "scrape_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scrape_job_next_scrape_at_idx" ON "scrape_job" USING btree ("next_scrape_at");