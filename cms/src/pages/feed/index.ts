// RSS feed: /feed/ (all updates; the old WordPress feed address). Built by src/lib/feeds.js.
import type { APIRoute } from "astro";
import { feedResponse } from "../../lib/feeds.js";

export const GET: APIRoute = (ctx) => feedResponse("all", ctx);
