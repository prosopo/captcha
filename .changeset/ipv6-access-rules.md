---
"@prosopo/user-access-policy": patch
---

Support IPv6 in access rule input transforms.

The portal-side ticket [prosopo/captcha-private#3379](https://github.com/prosopo/captcha-private/issues/3379) enables IPv6 rule creation. The CIDR parser in `userScopeInput` and the numeric→string reverse path in `transformRule` were both IPv4-only and would crash or produce wrong addresses when an IPv6 rule reached the provider.

- `userScopeInput.ts`: dispatch CIDR parsing to `Address4` vs `Address6` via `Address4.isValid`; both expose `startAddress()/endAddress().bigInt()`.
- `transformRule.ts`: `getStringIpFromNumeric` now uses `Address6.fromBigInt(...).correctForm()` for numeric values above `2^32 - 1`, keeping `Address4.fromInteger(...)` for IPv4 range.
- Adds a round-trip unit test for `2001:db8::1` + `/32` mask, plus three IPv6 CIDR cases (`/32`, `/64`, `/10`) alongside the existing IPv4 set.
