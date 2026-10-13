# Reviews CRM rollout

## Confirmed findings
- Delete previously set `closed`; no backend delete action existed.
- Optimistic updates, overlapping polling/focus requests and captured arrays could overwrite each other. The refresh callback also changed when review count changed, restarting polling/bootstrap.
- localStorage restored old reviews after API failures and a localStorage write error could fail an otherwise successful operation.
- Legacy rows with an empty ID were listed using their URL but mutation lookup searched only the ID column.
- CSV bulk upsert overwrote manager replies, notes and status with import defaults.
- Preview omitted VITE_REVIEWS_API_URL. Production continued on a failed curl health check; the old health handler never opened the sheet.

These are code defects; a successful live read does not establish which defect caused every reported incident. Read-only checks on 2026-10-13: health succeeded; list returned 68 reviews. No production records were changed.

## Changes
Server-confirmed mutations with immediate list refresh, no persistent review cache fallback, obsolete read protection, mutation serialization, bounded requests and explicit uncertain-save messages. Full editor, reply clearing, real deletion confirmation, native keyboard-accessible filters, sorting, assignee search, counts and quick close/reopen. Re-import adds missing records without overwriting existing manager edits. The UI explicitly explains that replies must be published at the original source manually.

Backend adds locked physical deletion, URL fallback lookup, idempotent creation by client ID, optional updatedAt conflict checks, sheet-backed versioned health and flush before unlock. Manager fields remain in the central Reviews sheet; the manager does not need sheet/script access.

## Before merge / production deployment
1. Back up the Reviews sheet using the owner's access.
2. Review access control. The checked-in Apps Script has no authentication/authorization, and live list is anonymously readable. Do not expose destructive administration publicly: enforce authenticated manager access in a backend/proxy or restricted deployment compatible with the frontend. A secret in a Vite variable is not protection. This PR does not implement identity management.
3. Deploy `google-apps-script/reviews-api.gs` as a new version of the existing Apps Script deployment. Preserve its URL and verify sheet schema, execution account and access permissions. A GitHub merge does NOT update Apps Script.
4. Health must report version 2 and delete capability; production publishing now fails until this contract is available.
5. Use a disposable test record to confirm browser create → read → edit all fields → clear reply → reload → delete → reload against the deployed backend, including failure permissions. Local tests use a Sheet mock and mocked browser HTTP; they cannot prove deployed Apps Script permissions or CORS.
6. Merge the PR only after these checks. GitHub Pages deploy then builds the frontend; check its Actions result and the manager's browser. Roll back the frontend via Git and script via Apps Script deployment version if necessary; deleted records require the backup.

## Validation
- `npm ci --legacy-peer-deps`, `npm run lint`, `npm run build`.
- `node scripts/test-reviews-api.mjs`: backend CRUD, clear reply, legacy IDs, retry, conflict and import preservation.
- Build with `VITE_REVIEWS_API_URL=https://reviews.test/exec`, start preview on port 4173, run `node scripts/test-reviews-ui.mjs`: desktop/mobile CRUD, write error retention, delete confirmation, cache outage and layout. BROWSER_PATH can select an installed Chromium browser.
- Existing `scripts/smoke-preview.mjs` checks other BI routes.

## Remaining limitations
No live backend deployment credentials are available in this workspace. Production CRUD and deployment are not claimed as verified. There is no role management/audit trail yet. Deletion is permanent. Browser timeout may occur after a committed write; refresh before retrying. Sheet display-value handling and original CSV parser remain legacy behavior. The build retains the existing large-bundle warning.

Local results: TypeScript and production build passed. Reviews backend tests and browser CRUD tests passed at 1440px and 390px. Other BI routes were tested with the currently published data snapshots (these snapshots are not committed).
