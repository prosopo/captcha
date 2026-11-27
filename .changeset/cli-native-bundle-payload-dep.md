---
"@prosopo/cli": patch
---

The cli now declares `@prosopo/native-bundle-payload` 0.2.0, whose native addon its bundle copies in. Without it the bundle could pick up a different, unbuilt copy of the package.
