// Public download of files uploaded in the EmDash admin (agendas, minutes, RFP documents).
// EmDash links them as /files/<key> (astro.config.mjs: r2 publicUrl), so they stay public while
// Cloudflare Access protects all of /_emdash. Keys are EmDash storage keys: a ULID plus extension
// before EmDash 1.6 (01ABC….pdf), two ULIDs joined by a dot from 1.6 on (01ABC….01DEF….pdf).
// Each dot-separated part must start with a letter or digit, so ".." and "/" can never match.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const SAFE_KEY = /^[0-9A-Za-z][0-9A-Za-z_-]{0,100}(\.[0-9A-Za-z][0-9A-Za-z_-]{0,100}){0,3}$/;

const serve: APIRoute = async ({ params, request }) => {
	const key = params.key ?? "";
	if (!SAFE_KEY.test(key)) return new Response("Not found", { status: 404 });
	const object = await env.MEDIA.get(key);
	if (!object) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("ETag", object.httpEtag);
	headers.set("Content-Length", String(object.size));
	headers.set("X-Content-Type-Options", "nosniff");
	// Keys are unique per upload, so a file at a given address never changes.
	headers.set("Cache-Control", "public, max-age=86400");
	if (request.headers.get("If-None-Match") === object.httpEtag) return new Response(null, { status: 304, headers });
	return new Response(request.method === "HEAD" ? null : object.body, { headers });
};

export const GET = serve;
export const HEAD = serve;
