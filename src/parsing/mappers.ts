import { Effect } from "effect";

import type { CompanyCsv, CompanyDb } from "@/schemas/company";
import type { LineCsv, LineDb } from "@/schemas/line";
import type { StationCsv, StationDb } from "@/schemas/station";

import { KuroshiroService } from "@/services/kuroshiro";

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

		return {
			id: row.station_cd,
			groupId: row.station_g_cd,
			name: row.station_name,
			nameKana,
			nameRomaji,
			nameEn: row.name_english ?? null,
			nameEnFormal: row.name_english_formal ?? null,
			lineId: row.line_cd,
			prefectureId: row.pref_cd,
			postalCode: row.post,
			address: row.address,
			location:
				row.lon != null && row.lat != null ? { x: row.lon, y: row.lat } : null,
			openedAt: row.open_ymd,
			closedAt: row.close_ymd,
			status: row.e_status,
			sort: row.e_sort,
		} satisfies StationDb;
	});
