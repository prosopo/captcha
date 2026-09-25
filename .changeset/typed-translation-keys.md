---
"@prosopo/locale": patch
"@prosopo/common": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/procaptcha-puzzle": patch
---

Translation keys are now a typed union built from the English catalogue, so calling the translator with a key that does not exist fails to compile. Error classes only pass a message to the translator when it is a real catalogue key, and free-text messages are shown as they are.
