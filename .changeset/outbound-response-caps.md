---
"@prosopo/util": minor
"@prosopo/api": patch
"@prosopo/ipinfo": patch
---

Cap how much of a response we will read. `@prosopo/util` gains `readCappedText` / `readCappedJson`, which refuse a body over a byte limit using both the declared Content-Length and the streamed length. The API client now refuses responses over 8 MiB, and the ipapi lookup refuses answers over 64 KiB and keeps its timeout running until the body has been read, so a server that sends headers and then stalls can no longer hang a lookup.
