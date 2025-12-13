ALTER TABLE "lines" ADD COLUMN "location" geometry(point);--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "location" geometry(point);--> statement-breakpoint
CREATE INDEX "lines_location_idx" ON "lines" USING gist ("location");--> statement-breakpoint
CREATE INDEX "stations_location_idx" ON "stations" USING gist ("location");--> statement-breakpoint
ALTER TABLE "lines" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "lines" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "stations" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "stations" DROP COLUMN "latitude";