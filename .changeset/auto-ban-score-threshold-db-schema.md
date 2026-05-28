---
"@prosopo/types-database": patch
---

fix(types-database): persist `autoBanScoreThreshold` on client settings

`autoBanScoreThreshold` was added to the zod `ClientSettingsSchema` and the
frictionless decision machine in #2592, but the Mongoose `UserSettingsSchema`
was never updated. Mongoose's strict mode silently dropped the field on every
`$set`, so neither the portal account collection nor the provider
`ClientRecord` collection ever persisted the value — meaning a system user
could set the threshold in the portal, the API would accept it, but the
provider would never actually enforce it.

Adds the field to the Mongoose schema (`Number`, `min: 0`, `required: false`,
no default) so the property is preserved on write.
