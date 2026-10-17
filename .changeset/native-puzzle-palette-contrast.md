---
"@prosopo/native-puzzle": patch
"@prosopo/provider": patch
---

The provider's Rust puzzle background generator now applies the same colour-blindness contrast check as the JS reference: when a palette is too flat for colour-blind users, it redraws it with a wider lightness range. It used to skip this, so about 1 in 60 backgrounds came out differently from the JS version. Those puzzles couldn't be replayed in the portal, and they missed the contrast floor. It's also why the puzzleRenderer replay test failed now and then.
