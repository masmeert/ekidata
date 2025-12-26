import * as cheerio from "cheerio";
import { Data, Effect } from "effect";

export class HtmlParseError extends Data.TaggedError("HtmlParseError")<{
	readonly message: string;
	readonly selector?: string;
}> {}

export type CheerioAPI = cheerio.CheerioAPI;

class HtmlParserService extends Effect.Service<HtmlParserService>()(
	"HtmlParserService",
	{
		effect: Effect.succeed({
			parse: (html: string): CheerioAPI => cheerio.load(html),

			selectText: ($: CheerioAPI, selector: string): string | null => {
				const text = $(selector).first().text().trim();
				return text || null;
			},

			selectAttr: (
				$: CheerioAPI,
				selector: string,
				attr: string,
			): string | null => {
				const value = $(selector).first().attr(attr);
				return value?.trim() || null;
			},

			selectAllTexts: ($: CheerioAPI, selector: string): string[] =>
				$(selector)
					.map((_, el) => $(el).text().trim())
					.get()
					.filter(Boolean),

			selectAllAttrs: (
				$: CheerioAPI,
				selector: string,
				attr: string,
			): string[] =>
				$(selector)
					.map((_, el) => $(el).attr(attr)?.trim())
					.get()
					.filter((v): v is string => Boolean(v)),

			selectAllHrefs: ($: CheerioAPI, selector: string): string[] =>
				$(selector)
					.map((_, el) => $(el).attr("href")?.trim())
					.get()
					.filter((v): v is string => Boolean(v)),
		}),
	},
) {}

export { HtmlParserService };
