---
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Fix the client-list poll, which has never carried site settings to a provider.

`getUpdatedClients` read `record.sites.siteKey` off the portal's `accounts` documents, where `sites` is an array. That property does not exist on an array, so every record came back as `{ account: undefined }`. `updateClientRecords` upserts filtered on `account`, so a whole poll's worth of sites matched nothing, inserted, and collapsed into a single `account: null` row that each run overwrote. An `as ClientRecord` cast on the mapping is what kept tsc quiet about it.

Observed on a production node: `GetClientList` completing every 2 minutes with `clientRecords: 1247`, one `account: null` row in `clients`, and 1,610 site keys still holding settings the portal had changed. Direct registration via the admin `SiteKeyRegister` endpoint was the only path actually updating providers.

- `getUpdatedClients` now flattens account → sites and emits one record per site, applying the `updatedAt` cutoff per site rather than relying on the document-level match. The account's `tier` is projected and attached; it was previously projected as `sites.tier`, which does not exist, so `tier` was undefined too.
- The cast is gone. `getUpdatedClients` returns `IUserDataSlim[]` and `updateClientRecords` accepts it — these are plain objects built from portal documents, never mongoose Documents, and the declared types now say so.
- `updateClientRecords` drops records with no account and logs the count instead of upserting them, so a future mapping bug cannot silently overwrite one row with every client's settings.

Adds an integration test covering the flattening, the per-site cutoff, and the active-user filter; it fails with `account: undefined` against the old mapping.
