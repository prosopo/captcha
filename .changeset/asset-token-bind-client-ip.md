---
"@prosopo/provider": patch
---

Image URLs signed with `PROSOPO_ASSET_TOKEN_BIND_IP` turned on are now bound to the client's IP address. They were bound to the text "[object Object]", so the image host rejected every image.
