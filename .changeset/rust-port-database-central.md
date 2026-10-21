---
"@prosopo/database": patch
---

Add the central captcha database and the central database streamer to the Rust port, and stream records from every provider method that streams in the TypeScript. Checked against commands recorded from the TypeScript on both databases, with the TypeScript's streamer unit tests and central streaming integration tests ported. The TypeScript is unchanged.
