---
"@prosopo/angular-procaptcha-integration-demo": patch
"@prosopo/angular-procaptcha-wrapper": patch
---

fix(deps): align @angular/* package versions at 20.3.25

Bumped @angular/common, @angular/platform-browser, @angular/router, @angular/cli, and @angular/compiler-cli from 20.3.16 to 20.3.25 to match @angular/core. Since each @angular/* subpackage pins its peer @angular/core to its own exact version, the prior mix produced an unresolvable peer-dep tree when installing from scratch.
