---
"@prosopo/user-access-policy": patch
---

Escape every tag value in access rule searches, not only coordinates, group ids and Web Bot Auth agents. A site key, user id, header hash or other value containing a hyphen, dot, colon or slash used to make the search a syntax error, so the lookup quietly found no rules and admin find or delete calls filtered on it reported success having matched nothing.
