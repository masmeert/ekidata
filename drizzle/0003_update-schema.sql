CREATE TYPE "public"."stamp_shape" AS ENUM('circle', 'square', 'hexagon', 'pentagon', 'other');--> statement-breakpoint
CREATE TYPE "public"."stamp_status" AS ENUM('available', 'discontinued', 'limited');--> statement-breakpoint
CREATE TABLE "stamp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" integer,
	"rally_id" uuid,
	"name" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"description" text,
	"description_en" text,
	"location_name" varchar(255),
	"location_name_en" varchar(255),
	"location_note" text,
	"location_note_en" text,
	"shape" "stamp_shape",
	"size_cm" varchar(32),
	"color" varchar(32),
	"color_en" varchar(32),
	"status" "stamp_status" DEFAULT 'available' NOT NULL,
	"available_from" date,
	"available_until" date,
	"image_url" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stamp_rally" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"start_date" date,
	"end_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stamp_rally_organizer" (
	"rally_id" uuid NOT NULL,
	"company_id" integer NOT NULL,
	CONSTRAINT "stamp_rally_organizer_rally_id_company_id_pk" PRIMARY KEY("rally_id","company_id")
);
--> statement-breakpoint
ALTER TABLE "companies" RENAME TO "company";--> statement-breakpoint
ALTER TABLE "lines" RENAME TO "line";--> statement-breakpoint
ALTER TABLE "prefectures" RENAME TO "prefecture";--> statement-breakpoint
ALTER TABLE "regions" RENAME TO "region";--> statement-breakpoint
ALTER TABLE "stations" RENAME TO "station";--> statement-breakpoint
ALTER TABLE "line" DROP CONSTRAINT "lines_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "prefecture" DROP CONSTRAINT "prefectures_region_id_regions_id_fk";
--> statement-breakpoint
ALTER TABLE "station" DROP CONSTRAINT "stations_line_id_lines_id_fk";
--> statement-breakpoint
ALTER TABLE "station" DROP CONSTRAINT "stations_prefecture_id_prefectures_id_fk";
--> statement-breakpoint
DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "lines_location_idx";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "stations_location_idx";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stamp" ADD CONSTRAINT "stamp_station_id_station_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."station"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp" ADD CONSTRAINT "stamp_rally_id_stamp_rally_id_fk" FOREIGN KEY ("rally_id") REFERENCES "public"."stamp_rally"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_rally_organizer" ADD CONSTRAINT "stamp_rally_organizer_rally_id_stamp_rally_id_fk" FOREIGN KEY ("rally_id") REFERENCES "public"."stamp_rally"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stamp_rally_organizer" ADD CONSTRAINT "stamp_rally_organizer_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stamp_station_id_idx" ON "stamp" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "stamp_rally_id_idx" ON "stamp" USING btree ("rally_id");--> statement-breakpoint
CREATE INDEX "stamp_rally_organizer_rally_id_idx" ON "stamp_rally_organizer" USING btree ("rally_id");--> statement-breakpoint
CREATE INDEX "stamp_rally_organizer_company_id_idx" ON "stamp_rally_organizer" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "line" ADD CONSTRAINT "line_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefecture" ADD CONSTRAINT "prefecture_region_id_region_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."region"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station" ADD CONSTRAINT "station_line_id_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station" ADD CONSTRAINT "station_prefecture_id_prefecture_id_fk" FOREIGN KEY ("prefecture_id") REFERENCES "public"."prefecture"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_location_idx" ON "line" USING gist ("location");--> statement-breakpoint
CREATE INDEX "station_location_idx" ON "station" USING gist ("location");