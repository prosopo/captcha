---
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

The scheduled spam email domain sync now only writes domains that are not already stored. It used to upsert the whole list (about 225k domains) on every run, which rewrote every row and held Mongo write locks for around 8 seconds per batch on every provider at the same time, slowing requests on the hour. It now reads the stored domains with an index-only scan and upserts just the new ones.

`bulkUpdateSpamEmailDomains` on the provider database is replaced by `insertMissingSpamEmailDomains(domains)`, which returns how many domains were added. The task records that count as `domainsAdded` alongside `domainsProcessed`. Domains that drop off the source lists are still kept, as before.
