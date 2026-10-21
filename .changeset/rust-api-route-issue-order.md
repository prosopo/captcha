---
"@prosopo/api-route": patch
---

Fix the Rust schema library reordering the parameters of a validation issue when it builds a validation error, so 400 bodies list them in zod's order. The TypeScript is unchanged.
