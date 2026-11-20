// RSS feed: /careers/feed.xml (9-1-1 center jobs, other agencies). Built by src/lib/feeds.js.
import type { APIRoute } from "astro";
import { feedResponse } from "../../lib/feeds.js";

export const GET: APIRoute = (ctx) => feedResponse("jobs", ctx);
