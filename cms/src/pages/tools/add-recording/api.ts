// Server half of the "Add recording" staff page: the Cloudflare Stream calls, which need the API token.
// The page itself updates the meeting through EmDash's own content API, as the signed-in staff member.
//
// POST { action: "start", url }  → Stream fetches the Dropbox video (or reuses one already fetched by that name)
// POST { action: "status", uid } → processing state; starts English captions once the video is ready
//
// Only signed-in EmDash Editors and Admins (role 40+) may call it. EmDash sets locals.user on public routes from the
// staff member's admin session. The X-EmDash-Request header blocks cross-site posts (browsers can't add it cross-origin).
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { normalizeDropboxUrl, recordingState } from "../../../lib/recordings.js";

// The District Cloudflare account (also in wrangler.jsonc). Override with the STREAM_ACCOUNT_ID variable if needed.
const DEFAULT_ACCOUNT = "fd14180882e36accc0cf6a3c42d3c391";
const EDITOR = 40;
const UID = /^[a-f0-9]{32}$/;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
	});

async function stream(path: string, init: RequestInit = {}) {
	const vars = env as unknown as Record<string, string | undefined>;
	const account = vars.STREAM_ACCOUNT_ID || DEFAULT_ACCOUNT;
	const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream${path}`, {
		...init,
		headers: { Authorization: `Bearer ${vars.STREAM_API_TOKEN}`, "Content-Type": "application/json", ...init.headers },
	});
	const body = (await res.json().catch(() => null)) as { success?: boolean; result?: any; errors?: { message?: string }[] } | null;
	if (!res.ok || !body?.success) {
		const msg = body?.errors?.map((e) => e.message).filter(Boolean).join("; ") || `HTTP ${res.status}`;
		throw new Error(`Cloudflare Stream: ${msg}`);
	}
	return body.result;
}

export const POST: APIRoute = async ({ request, locals }) => {
	const user = (locals as { user?: { role?: number } }).user;
	if (!user || (user.role ?? 0) < EDITOR) return json({ error: "Sign in to the admin as an Editor first." }, 403);
	if (request.headers.get("X-EmDash-Request") !== "1") return json({ error: "Missing request header." }, 403);
	if (!(env as unknown as Record<string, string | undefined>).STREAM_API_TOKEN) {
		return json({ error: "This site is missing its Stream API token (STREAM_API_TOKEN). Ask the site Admin." }, 503);
	}

	let input: { action?: string; url?: string; uid?: string };
	try {
		input = await request.json();
	} catch {
		return json({ error: "Bad request." }, 400);
	}

	try {
		if (input.action === "start") {
			let link;
			try {
				link = normalizeDropboxUrl(input.url);
			} catch (err) {
				return json({ error: (err as Error).message }, 400);
			}
			// Pasting the same link twice (or after closing the page) reuses the video instead of uploading a copy.
			const found = ((await stream(`?search=${encodeURIComponent(link.filename)}`)) ?? []) as any[];
			const existing = found.find((v) => v?.meta?.name === link.filename && v?.status?.state !== "error");
			const video = existing ?? (await stream("/copy", { method: "POST", body: JSON.stringify({ url: link.url, meta: { name: link.filename } }) }));
			return json({ uid: video.uid, filename: link.filename, reused: Boolean(existing) });
		}

		if (input.action === "status") {
			if (!UID.test(String(input.uid))) return json({ error: "Bad video ID." }, 400);
			const video = await stream(`/${input.uid}`);
			let captions = ((await stream(`/${input.uid}/captions`)) ?? []) as any[];
			const state = recordingState(video, captions);
			if (state.ready && state.captions === "none") {
				await stream(`/${input.uid}/captions/en/generate`, { method: "POST" });
				captions = [{ language: "en", status: "inprogress" }];
			}
			return json(recordingState(video, captions));
		}

		return json({ error: "Unknown action." }, 400);
	} catch (err) {
		console.error("add-recording", err);
		return json({ error: (err as Error).message }, 502);
	}
};

export const GET: APIRoute = () => json({ error: "Use POST." }, 405);
