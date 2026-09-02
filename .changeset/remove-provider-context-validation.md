---
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": patch
"@prosopo/cli": patch
---

Remove the provider-side context validation path.

The provider read a per-context baseline out of `clientcontextentropies` on the frictionless path and compared a session's head hash against it. The task that wrote that collection was removed from the provider on 2026-08-21, so the read has returned `undefined` ever since and the branch has been dead in every deployment since then. Computing and applying the baseline now happens off-provider.

Removed: `contextAwareValidation.ts`, the decision-machine branch that used it, `getClientContextEntropy` on the provider and its database method, the `clientContextEntropy` table registration, the unused `getRoundsFromSimScore` helper, and the `contextAwareEnabled` parameter threaded into image verification — which logged and then did nothing, its return commented out.

Also removes the per-site `settings.contextAware` block that configured it, along with `ContextAwareSchema`, `IContextAware`, `IContexts`, `ContextConfigSchema`, `contextAwareThresholdDefault` and `expandContexts`, the legacy `default`/`webview` context keys and their helpers, and `FrictionlessReason.CONTEXT_AWARE_VALIDATION_FAILED`. The site-key registration CLI no longer writes a `contextAware` default into new sites.

`ContextType`, `contextTypeFromSession` and `deviceContextTypes` stay — the off-provider work keys on them. `ClientContextEntropyRecord` and its schema stay for the same reason; only the provider's use of them goes.

No behaviour change: every path removed here was already inert.
