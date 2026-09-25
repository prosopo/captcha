---
"@prosopo/cli": patch
---

The cli bundle test builds a full production bundle and takes over a minute, so it is now named as an integration test instead of a unit test. Running only unit tests (`TEST_TYPE=unit`) no longer includes it. CI runs every test type, so it still runs there.
