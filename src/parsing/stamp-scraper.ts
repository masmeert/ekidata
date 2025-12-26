import { Effect } from "effect";

import type {
	ScrapedPage,
	ScrapedStamp,
	ScrapedStampStatus,
} from "@/schemas/scraped";
import { type CheerioAPI, HtmlParserService } from "@/services/html-parser";
import { ScraperService } from "@/services/scraper";

const BASE_URL = "https://stamp.funakiya.com";

const extractStationUrls = ($: CheerioAPI): string[] => {
	const urls: string[] = [];
	$("ul.allArticleList > li > a[href]").each((_, el) => {
		const href = $(el).attr("href");
		if (href?.startsWith(BASE_URL) && href.endsWith(".html")) {
			urls.push(href);
		}
	});
	return [...new Set(urls)];
};

const parseCoordinates = (
	geoUri: string | null,
): { lat: number; lon: number } | null => {
	if (!geoUri) return null;
	const match = geoUri.match(/([\d.]+),\s*([\d.]+)/);
	if (!match?.[1] || !match[2]) return null;
	const lat = Number.parseFloat(match[1]);
	const lon = Number.parseFloat(match[2]);
	if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
	return { lat, lon };
};

const parseSize = (sizeText: string | null): string | null => {
	if (!sizeText) return null;
	const match = sizeText.match(/サイズ[：:]\s*(.+)/);
	return match?.[1]?.trim() || null;
};

const parseColor = (colorText: string | null): string | null => {
	if (!colorText) return null;
	const match = colorText.match(/色[：:]\s*(.+)/);
	return match?.[1]?.trim() || null;
};

const parseLocationNote = (noteText: string | null): string | null => {
	if (!noteText) return null;
	const match = noteText.match(/設置場所[：:]\s*(.+)/);
	return match?.[1]?.trim() || null;
};

const parseAvailabilityDates = (
	text: string | null,
): { from: string | null; until: string | null } => {
	if (!text) return { from: null, until: null };
	const match = text.match(/設置期間[：:]\s*(.+)/);
	if (!match?.[1]) return { from: null, until: null };
	const range = match[1];
	const dateParts = range.split(/[～〜-]/);
	return {
		from: dateParts[0]?.trim() || null,
		until: dateParts[1]?.trim() || null,
	};
};

const parseStampedDate = (text: string | null): string | null => {
	if (!text) return null;
	const match = text.match(/スタンプを押した日[：:]\s*(.+)/);
	return match?.[1]?.trim() || null;
};

const extractStampsFromSection = (
	$: CheerioAPI,
	section: ReturnType<CheerioAPI>,
	status: ScrapedStampStatus,
): ScrapedStamp[] => {
	const stamps: ScrapedStamp[] = [];

	section.find("h5").each((_, h5El) => {
		const h5 = $(h5El);
		const title = h5.text().trim();
		if (!title) return;

		const contentParts: string[] = [];
		let current = h5.next();
		while (current.length && !current.is("h5") && !current.is("hr")) {
			if (current.is("p")) {
				contentParts.push(current.text());
			}
			current = current.next();
		}
		const fullText = contentParts.join("\n");

		const imageEl = h5.nextAll("div").first().find("img");
		const imageUrl = imageEl.attr("src") || null;

		const dates = parseAvailabilityDates(fullText);

		stamps.push({
			title,
			description: null,
			locationNote: parseLocationNote(fullText),
			size: parseSize(fullText),
			color: parseColor(fullText),
			imageUrl,
			status,
			availableFrom: dates.from,
			availableUntil: dates.until,
			stampedDate: parseStampedDate(fullText),
		});
	});

	return stamps;
};

const parseDetailPage = ($: CheerioAPI, pageUrl: string): ScrapedPage => {
	const titleEl = $(".articleHeader h2");
	const name = titleEl
		.text()
		.replace(/のスタンプ$/, "")
		.trim();

	const articleBody = $(".articleBody");
	const infoText = articleBody.text();

	const nameKanaMatch = infoText.match(/駅名称[：:].+[（(](.+?)[）)]/);
	const nameEnMatch = infoText.match(/EN[：:]\s*(.+)/m);
	const addressMatch = infoText.match(/所在地[：:]\s*(.+)/m);
	const postalMatch = addressMatch?.[1]?.match(/〒?([\d-]+)/);
	const geoMatch = infoText.match(/Geo URI[：:]\s*([\d.,\s]+)/);
	const companyMatch = $(".articleHeader .date")
		.text()
		.match(/(.+?)のスタンプ/);

	const stamps: ScrapedStamp[] = [];

	$("details").each((_, detailsEl) => {
		const details = $(detailsEl);
		const summary = details.find("summary").text().trim();

		let status: ScrapedStampStatus = "available";
		if (summary.includes("廃止")) status = "discontinued";
		else if (summary.includes("期間限定")) status = "limited";

		stamps.push(...extractStampsFromSection($, details, status));
	});

	return {
		location: {
			name,
			nameKana: nameKanaMatch?.[1] || null,
			nameEn: nameEnMatch?.[1]?.trim() || null,
			address: addressMatch?.[1]?.replace(/〒[\d-]+\s*/, "").trim() || null,
			postalCode: postalMatch?.[1] || null,
			coordinates: parseCoordinates(geoMatch?.[1] || null),
			companyName: companyMatch?.[1]?.trim() || null,
			lineName: null,
			pageUrl,
		},
		stamps,
	};
};

export const fetchLineIndex = (lineUrl: string) =>
	Effect.gen(function* () {
		const scraper = yield* ScraperService;
		const parser = yield* HtmlParserService;

		const html = yield* scraper.fetchPage(lineUrl);
		const $ = parser.parse(html);
		return extractStationUrls($);
	});

export const fetchStampPage = (pageUrl: string) =>
	Effect.gen(function* () {
		const scraper = yield* ScraperService;
		const parser = yield* HtmlParserService;

		const html = yield* scraper.fetchPage(pageUrl);
		const $ = parser.parse(html);
		return parseDetailPage($, pageUrl);
	});

export const scrapeLineStamps = (lineUrl: string) =>
	Effect.gen(function* () {
		yield* Effect.log(`Discovering station pages from: ${lineUrl}`);
		const stationUrls = yield* fetchLineIndex(lineUrl);
		yield* Effect.log(`Found ${stationUrls.length} station pages`);

		const results: ScrapedPage[] = [];
		for (const url of stationUrls) {
			const page = yield* fetchStampPage(url);
			results.push(page);
			yield* Effect.log(
				`Scraped ${page.location.name}: ${page.stamps.length} stamps`,
			);
		}

		return results;
	});
