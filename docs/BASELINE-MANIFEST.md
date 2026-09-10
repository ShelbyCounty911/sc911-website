# Baseline manifest

## Windows Codex deliverable

The Windows Codex deliverable path is inaccessible from this cloud agent environment. File-level equality against that Windows path cannot be verified here.

## Reproducible SHA-256 comparison

Compare this branch's `public/` tree against any other baseline copy using relative paths from inside `public/`:

```bash
cd public && find . -type f | sort | while read f; do sha256sum "$f"; done
```

Committed reference output for this branch:

- [`docs/public-sha256-main.txt`](./public-sha256-main.txt)

Diff that file against the same command run on another checkout (for example the Windows Codex deliverable) to confirm bit-for-bit equality of every file under `public/`.

## Intentional `public/review.html` change

The intentional change to `public/review.html` relative to older working copies was adding a robots `noindex` meta tag for CI preview protection:

```html
<meta name="robots" content="noindex,nofollow">
```

Do not treat that robots meta addition as an accidental content drift when comparing baselines.

| Path | Pre-noindex SHA-256 | Current SHA-256 |
|------|---------------------|-----------------|
| `./review.html` | `9ab0064f0fe843df91c03cea7a72c2bc7c10a26d964816910e8cb457a5dcc8cb` | `4f985f430e169e218fad6a3d86a274f842a5653b376ae806a8d942c39203f0a4` |
