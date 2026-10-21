---
"@prosopo/locale": patch
---

Hold express at 4 in `@prosopo/locale`, because the i18next middleware it uses
has no express 5 typings.

`i18next-http-middleware@3.9.9` types the handler returned by `handle()` against
express 4. On express 5 that handler no longer matches the `app.use` it is passed
to, so locale stops compiling with "Argument of type 'Handler' is not assignable
to parameter of type 'PathParams'".

This repo's own CI never saw it. The middleware's type definitions import
`express-serve-static-core` by bare name while declaring it only as a
devDependency, so pnpm gives the middleware no copy of its own and the import
resolves to whichever version reached the hoisted directory. Here that is
express 5 and everything passes. In a workspace that embeds this one alongside
express 4 consumers, the express 4 types win the hoist instead, the handler comes
back typed for express 4, and the build fails. That is how v3.8.36 shipped green
and broke its consumer.

Dependabot is set to ignore express 5 for now. Lift the pin and the ignore
together once the middleware ships express 5 typings.
