---
---

Port the image challenge's asset URL sealing and signing to Rust, producing byte-identical URLs to the TypeScript (which still opens sealed URLs at the CDN edge). The Rust datasets `AssetsResolver` can now refuse a URL, as the TypeScript one throws. No npm package changes.
