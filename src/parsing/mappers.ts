import { Effect } from "effect";

import type { CompanyCsv, CompanyDb } from "@/schemas/company";
import type { LineCsv, LineDb } from "@/schemas/line";
import type { ScrapedStamp } from "@/schemas/scraped";
import type { StationCsv, StationDb, StationLineDb } from "@/schemas/station";

import { KuroshiroService } from "@/services/kuroshiro";

export type StampShape = "circle" | "square" | "hexagon" | "pentagon" | "other";

const SHAPE_MAP: Record<string, StampShape> = {
	円形: "circle",
	円: "circle",
	丸形: "circle",
	丸: "circle",
	四角形: "square",
	四角: "square",
	正方形: "square",
	長方形: "square",
	角形: "square",
	六角形: "hexagon",
	五角形: "pentagon",
};

const COLOR_MAP: Record<string, string> = {
	赤: "red",
	紅: "red",
	朱: "vermillion",
	橙: "orange",
	オレンジ: "orange",
	黄: "yellow",
	黄色: "yellow",
	緑: "green",
	青: "blue",
	水色: "light blue",
	紺: "navy",
	紫: "purple",
	ピンク: "pink",
	桃: "pink",
	茶: "brown",
	黒: "black",
	灰: "gray",
	白: "white",
	金: "gold",
	銀: "silver",
};

export function parseShape(sizeText: string | null): StampShape {
	if (!sizeText) return "other";

	for (const [jpShape, enShape] of Object.entries(SHAPE_MAP)) {
		if (sizeText.includes(jpShape)) {
			return enShape;
		}
	}

	return "other";
}

export function parseSizeCm(sizeText: string | null): string | null {
	if (!sizeText) return null;

	const heightMatch = sizeText.match(/縦\s*([\d.]+)\s*cm/);
	const widthMatch = sizeText.match(/横\s*([\d.]+)\s*cm/);
	const diameterMatch = sizeText.match(/([\d.]+)\s*cm.*円/);

	if (heightMatch?.[1] && widthMatch?.[1]) {
		return `${heightMatch[1]}x${widthMatch[1]}cm`;
	}

	if (diameterMatch?.[1]) {
		return `${diameterMatch[1]}cm`;
	}

	const anySize = sizeText.match(/([\d.]+)\s*cm/);
	if (anySize?.[1]) {
		return `${anySize[1]}cm`;
	}

	return null;
}

export function parseColorEn(colorJp: string | null): string | null {
	if (!colorJp) return null;

	for (const [jp, en] of Object.entries(COLOR_MAP)) {
		if (colorJp.includes(jp)) {
			return en;
		}
	}

	return colorJp;
}

export interface NormalizedStamp {
	title: string;
	description: string | null;
	locationNote: string | null;
	sizeCm: string | null;
	shape: StampShape;
	color: string | null;
	colorEn: string | null;
	imageUrl: string | null;
	status: "available" | "discontinued" | "limited";
	availableFrom: string | null;
	availableUntil: string | null;
}

export function normalizeStamp(scraped: ScrapedStamp): NormalizedStamp {
	return {
		title: scraped.title,
		description: scraped.description,
		locationNote: scraped.locationNote,
		sizeCm: parseSizeCm(scraped.size),
		shape: parseShape(scraped.size),
		color: scraped.color,
		colorEn: parseColorEn(scraped.color),
		imageUrl: scraped.imageUrl,
		status: scraped.status,
		availableFrom: scraped.availableFrom,
		availableUntil: scraped.availableUntil,
	};
}

export function normalizeStamps(
	stamps: readonly ScrapedStamp[],
): NormalizedStamp[] {
	return stamps.map(normalizeStamp);
}

export type StationMapped = {
	station: StationDb;
	stationLine: StationLineDb;
};

export const mapCompany = (row: CompanyCsv) =>
	Effect.gen(function* () {
		const kuroshiro = yield* KuroshiroService;
		const nameRomaji =
			row.company_name_r ?? (yield* kuroshiro.toRomaji(row.company_name));

		return {
			id: row.company_cd,
			rrCd: row.rr_cd,
			name: row.company_name,
			nameKana: row.company_name_k,
			nameHira: row.company_name_h,
			nameRomaji,
			nameEn: row.company_name_en,
			nameEnFormal: row.company_name_en_formal,
			url: row.company_url,
			type: row.company_type,
			status: row.e_status,
			sort: row.e_sort,
		} satisfies CompanyDb;
	});

export const mapLine = (row: LineCsv) =>
	Effect.gen(function* () {
		const kuroshiro = yield* KuroshiroService;
		const nameKana =
			row.line_name_k ?? (yield* kuroshiro.toHiragana(row.line_name));
		const nameRomaji =
			row.line_name_r ?? (yield* kuroshiro.toRomaji(row.line_name));

		return {
			id: row.line_cd,
			companyId: row.company_cd,
			name: row.line_name,
			nameKana,
			nameRomaji,
			nameHira: row.line_name_h,
			nameEn: row.line_name_en ?? null,
			nameEnFormal: row.line_name_en_formal ?? null,
			colorCode: row.line_color_c,
			colorText: row.line_color_t,
			type: row.line_type,
			location:
				row.lon != null && row.lat != null ? { x: row.lon, y: row.lat } : null,
			zoom: row.zoom,
			status: row.e_status,
			sort: row.e_sort,
		} satisfies LineDb;
	});

export const mapStation = (row: StationCsv) =>
	Effect.gen(function* () {
		const kuroshiro = yield* KuroshiroService;
		const nameKana =
			row.station_name_k ?? (yield* kuroshiro.toHiragana(row.station_name));
		const nameRomaji =
			row.station_name_r ?? (yield* kuroshiro.toRomaji(row.station_name));

		const station: StationDb = {
			id: row.station_g_cd,
			name: row.station_name,
			nameKana,
			nameRomaji,
			nameEn: row.name_english ?? null,
			nameEnFormal: row.name_english_formal ?? null,
			prefectureId: row.pref_cd,
			postalCode: row.post,
			address: row.address,
			location:
				row.lon != null && row.lat != null ? { x: row.lon, y: row.lat } : null,
			openedOn: row.open_ymd,
			closedOn: row.close_ymd,
			status: row.e_status,
		};

		const stationLine: StationLineDb = {
			stationId: row.station_g_cd,
			lineId: row.line_cd,
			originalStationId: row.station_cd,
			sortOrder: row.e_sort,
		};

		return { station, stationLine } satisfies StationMapped;
	});
