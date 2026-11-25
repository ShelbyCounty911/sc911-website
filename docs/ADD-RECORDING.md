# Add a meeting recording (staff page)

Staff page: **`/tools/add-recording/`** (shelbycounty911.org after launch; until then the production Worker's workers.dev address).

Paste the Dropbox link to a meeting video. The site then:

1. Asks Cloudflare Stream to fetch the video from Dropbox. It turns the share link's `dl=0` into `dl=1`.
2. Waits while Stream processes it, showing progress. A long meeting takes several minutes; keep the page open.
3. Starts English captions (Stream's auto-generated captions), unless the video already has them.
4. Adds the Stream watch link to the meeting's **Recording link** and publishes, so "Watch recording" appears on Meeting records.

The meeting is picked from the file name. For example, `2026-11-23-26-Executive-Committee-Meeting.mp4` matches the Nov 23 Executive Committee meeting. Staff can change the pick. If the meeting already has a recording, the page asks before replacing it. Pasting the same link again (for example after closing the page) reuses the video already in Stream instead of uploading a second copy.

## Who can use it

Only signed-in **Editors and Admins** (EmDash role 40+). Staff sign in to the admin (`/_emdash/admin`) first. Anyone else sees a sign-in message, and the page's endpoint refuses them.

- The Stream calls run on the server with the API token. Staff never see the token.
- The meeting update goes through EmDash's own content API as the signed-in staff member, so EmDash's normal permissions still apply.

## One-time setup (Cloudflare dashboard)

1. **Create the API token.** Go to **My Profile → API Tokens → Create Token → Create Custom Token**.
   - **Name:** `sc911-cms Stream (add recording)`
   - **Permissions:** Account · **Stream** · **Edit**
   - **Account Resources:** Include · Shelby County 911 District
   - Leave the rest as is, and create the token. Copy it; Cloudflare shows it only once.
2. **Save it on the production Worker.** Go to **Workers & Pages → sc911-cms → Settings → Variables and Secrets** (runtime, not Build). Add a **Secret** named `STREAM_API_TOKEN` with the token value, then deploy.
3. **Optional, for testing on the test site:** add the same secret to **sc911-cms-spike**. Videos sent from the test site go into the same Stream account, so delete test videos in Stream afterward.

If the secret is missing, the page says so and nothing changes.

## Code

- `cms/src/pages/tools/add-recording/index.astro`: the page.
- `cms/src/pages/tools/add-recording/api.ts`: the Stream calls (`start`, `status`).
- `cms/src/lib/recordings.js`: link handling, file-name matching and Stream state.
- `scripts/check-recordings.mjs`: tests for that logic, run in CI.
