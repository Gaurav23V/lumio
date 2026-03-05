# Operations Runbook

## Debugging Web Upload and Reader Errors

The web app talks directly from the browser to Supabase and Google Drive—there is no Lumio backend server. Use these places to inspect errors:

| Layer | Where to look | What you see |
|-------|---------------|--------------|
| **Browser** | DevTools → Console | JS errors, adapter exceptions (e.g. `HttpResponseError` from Drive) |
| **Browser** | DevTools → Network | Failed requests to `*.supabase.co` and `*.googleapis.com` (status, response body) |
| **Supabase** | Dashboard → Logs → [API logs](https://supabase.com/dashboard/project/_/logs/edge-logs) | REST/GraphQL requests, status codes, latency |
| **Supabase** | Dashboard → Logs → Postgres logs | Query errors, RLS rejections |
| **Supabase** | Dashboard → Logs → Auth logs | Auth failures, token issues |
| **Google Cloud** | APIs & Services → Drive API → Metrics | Request counts, error rates |
| **Google Cloud** | Cloud Logging (if enabled) | Drive API request/response details |

**Quick checks:** Filter Network by `supabase` or `googleapis`; in Supabase API logs filter by path (e.g. `/rest/v1/books`) or status code.

## Sync Troubleshooting

## Quick Triage

1. Verify auth session is valid
2. Verify network connectivity
3. Inspect local queue size/status
4. Verify Supabase RLS and policy alignment
5. Verify Google Drive token freshness and scope

## Common Issues

### Progress not syncing

- Check queue contains `UPDATE_PROGRESS`
- Confirm periodic sync loop is active
- Validate conflict resolver result (newer version should win)

### File upload stuck

- Check resumable upload session status
- For 4xx on resumable upload, recreate session and retry
- For 5xx/network errors, resume from returned byte range

### Empty Supabase reads

- Usually RLS policy mismatch or missing auth session
- Confirm JWT subject maps to expected `user_id`

### Desktop opens book only when online

- Verify cache entry exists and status is `CACHED`
- Verify cache path permissions in Tauri capabilities

## Logging Guidance

- Include correlation IDs for sync passes
- Include per-book status transitions
- Never log raw tokens or sensitive user secrets

## Recovery Procedures

### Force Full Metadata Resync

1. Preserve local unsynced queue entries
2. Reset `last_sync_at` cursor
3. Pull full cloud state
4. Re-apply pending local mutations in deterministic order

### Rebuild Desktop Local DB

1. Backup local DB and cache metadata
2. Recreate schema/migrations
3. Pull cloud metadata baseline
4. Reconcile local cache index

## Manual Validation Checklist

- Import file on desktop and read before upload completes
- Confirm file appears in Drive
- Open same file on web and resume near exact position
- Move folder on web, verify folder movement reflected on desktop
- Disconnect desktop network, read/update progress, reconnect, and verify sync
