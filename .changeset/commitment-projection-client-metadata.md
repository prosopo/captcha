---
"@prosopo/database": patch
---

Include `clientMetaData` in the commitment projection.

`DAPP_USER_COMMITMENT_PROJECTION` enumerates the fields the verify path reads
off `solution`. `clientMetaData` arrived in 5.5.0 with the client-session
correlation but was never added, so both `getDappUserCommitmentById` and
`getDappUserCommitmentByAccount` returned it as `undefined` on every fetch —
whatever was stored on the record.

`isClientSessionMismatch(expected, undefined)` is therefore true whenever the
caller supplies a session id, so every image captcha verified through a caller
that correlates on a session was disapproved with `CLIENT_SESSION_MISMATCH`:
a token replay reported on solves earned in exactly the session they claimed.

PoW and puzzle were unaffected — they read their own challenge record rather
than this projection, which is why the failure was confined to image captchas.

The projection's own regression test now asserts the field round-trips; it was
written to catch this class of bug and did not cover this field.
