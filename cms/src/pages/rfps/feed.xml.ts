// RSS feed: /rfps/feed.xml. Built by src/lib/feeds.js.
import type { APIRoute } from "astro";
import { feedResponse } from "../../lib/feeds.js";

export const GET: APIRoute = (ctx) => feedResponse("rfps", ctx);
