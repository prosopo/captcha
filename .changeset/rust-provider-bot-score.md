---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The Rust provider can now score a widget's detector payload through the pluggable decoder and clean up the detector's reported signals before they are stored, as the TypeScript does. The TypeScript is unchanged.
