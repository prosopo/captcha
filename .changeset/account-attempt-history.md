---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
---

Decision machines can now see a user account's recent attempts on every provider, not just the one serving the request.

Each finished puzzle, PoW, audio and icon-order attempt is written to a small `accountattempts` collection in the central database, which deletes entries after 15 minutes. At server verify the provider reads the account's last 10 minutes from it and passes four new fields to the decision machine: `accountFailures10m`, `accountPrevAttemptAgeSeconds`, `accountPrevAttemptFailed` and `accountPrevAttemptAsn`.

This matters because callers that switch IP are routed to a different provider, which until now knew nothing about their earlier failures. The read is skipped when there is no central connection and abandoned after 250 ms, in which case the fields are left out rather than set to zero. Nothing acts on the fields yet.
