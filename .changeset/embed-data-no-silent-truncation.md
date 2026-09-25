---
"@prosopo/util": patch
---

`embedData` no longer corrupts the click coordinates it hides in a captcha salt. Positions are stored as one byte, but the values were written at the end of the salt, so once the salt passed 256 hex characters (about nine selected image tiles) the positions were cut to two hex digits and the provider read back the wrong numbers. Values are now packed below position 256, and anything that genuinely cannot fit (more than 255 values, a salt that is too short, or a value that is not a non-negative integer) throws instead of being silently mangled. The size check also no longer counts the `0x` prefix or ignores the count byte. The format is unchanged, so existing providers decode the output as before.
