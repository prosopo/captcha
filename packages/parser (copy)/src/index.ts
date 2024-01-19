// TODO should parsing options be specific to the parser? probably. E.g. coerce makes no sense for object/array parsing
// TODO export functions independently to allow tree shaking
// TODO add parser for native enum
// TODO choose between classic enum parsing and new (ts v5+) enum parsing using const in generic arg
// TODO add extends
// TODO build validation fns (can use external lib for that)
// TODO add .merge()
// TODO add .pick()
// TODO add .omit()
// TODO add .partial()
// TODO add .deepPartial() - can be arg to parser?
// TODO add passthrough
// TODO add .default()
// TODO add .strip()
// TODO add .catchall()
// TODO add .element()
// TODO add .nonempty()
// TODO add tuple
// TODO add discriminate unions
// TODO add maps
// TODO add sets
// TODO add intersection
// TODO add recursive type support
// TODO add JSON parsing
// TODO add function parsing
// TODO brand?
// TODO can we combine nullable and optional into some kind of except or union?
// TODO validate needs options for strict, extra keys, etc
// TODO check native enum works
// TODO check enum/options for each type of enum works
// TODO add chaining to all types, e.g. able to do .optional(), etc
// TODO split up into classes, enable tree shaking via exports in pkg json
// TODO should coerce be defined on the parser? perhaps the default should be defined on the parser, but can override it with params while parsing
// TODO validation message?
// TODO work out whether mandatory (i.e. reverse of optional / nullable) is useful + whether it should use required
// TODO deepPartial
// TODO do we have parsers for all ts helper types ,e.g. Partial, Required, Readonly, etc?
// TODO json parser?
// TODO parser for bigint lib that pjs uses?
// TODO number disallow null coercion
// TODO number disallow undefined coercion
// TODO put union + nullabel + optional on parser?

