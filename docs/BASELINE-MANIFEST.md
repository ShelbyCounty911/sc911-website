# Baseline manifest — `public/` SHA-256

## Windows deliverable path

The original Windows deliverable path for the approved mockup package was **inaccessible in this Cloud Agent environment**. Comparison and hashing therefore use the GitHub-sourced checkout of `ShelbyCounty911/sc911-website` (current `main` tip when this manifest was generated), not a local Windows filesystem path.

## Attached manifest

- File: [`docs/public-sha256-main.txt`](./public-sha256-main.txt)
- Generated on this checkout with:

```bash
find public -type f | sort | xargs sha256sum
```

Paths in the manifest are relative (`public/...`). Re-run the same command on another machine and `diff` the outputs to verify byte-identical assets.

## Known intentional difference vs earlier GitHub-sourced baseline

Compared to the earlier GitHub-sourced review package used for the first approved deploy (`sc911-cursor-review` / pre-CI baseline), **only** `public/review.html` differs:

| Path | Earlier baseline SHA-256 | Current `main` SHA-256 |
|------|--------------------------|------------------------|
| `public/review.html` | `9ab0064f0fe843df91c03cea7a72c2bc7c10a26d964816910e8cb457a5dcc8cb` | `4f985f430e169e218fad6a3d86a274f842a5653b376ae806a8d942c39203f0a4` |

Cause: addition of `<meta name="robots" content="noindex,nofollow">` so site validation (`validate-site` / `scripts/check-site.mjs`) passes. All other `public/` relative paths match the earlier baseline hashes.

## Procedure to re-compare

1. Obtain a tree that contains the `public/` directory to verify.
2. From the repository root:

   ```bash
   find public -type f | sort | xargs sha256sum > /tmp/public-sha256-compare.txt
   diff -u docs/public-sha256-main.txt /tmp/public-sha256-compare.txt
   ```

3. Expect no diff for an identical tree. A sole `public/review.html` mismatch against a pre-noindex package is the intentional change documented above.
