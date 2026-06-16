---
---

test(user-access-policy): assumption tests for findRulesRanked HGETALL refactor. No source changes — three follow-up regression tests for #2702 covering rank ordering, Block-over-Restrict severity tiebreaker, and HGETALL race-safety. Locks in the contract the hotfix's FT.AGGREGATE → HGETALL refactor relies on so future refactors can't silently break it.
