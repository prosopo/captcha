---
---

Return the crawler's name beside `isCrawler` instead of inside it.

The ipapi.is worker returned the crawler's name — "GoogleBot", "BaiduSpider" — through a field called `is_crawler` that every consumer declared a boolean, so checking it for `true` matched nothing. The reputation service that replaced it answers a real boolean and a separate name, so `isCrawler` is now genuinely a boolean and the name is in `crawlerName`.

Nothing that makes a decision changes: a name and `true` are both truthy, which is how every caller already reads it. What comes back is the ability to say which crawler was seen.
