---
"@prosopo/vite-plugin-watch-workspace": patch
---

Add unit and type tests for the workspace watch plugin, and fix the defects they exposed:

- File discovery matched nothing. The whole glob pattern was passed through `fast-glob`'s `convertPathToPattern`, which escapes `*`, `(` and `|` so a path can be used as a literal pattern — so the plugin searched for a file literally named `**` and watched an empty set. Only the directory is converted now.
- A relative `extends` in a package tsconfig was resolved against `process.cwd()` on the first hop instead of against the tsconfig's own directory, so the base config was silently not merged and the default `rootDir`/`outDir` were used.
- An unreadable tsconfig threw `Cannot read properties of undefined`; `typescript`'s reader also reports a missing file through `error` while still returning `config: {}`, which looked like a valid all-defaults tsconfig. Both now yield an empty config the caller can fall back from.
- A cyclic `extends` chain recursed until the stack overflowed. It now throws a message naming the file.
- Output paths were rewritten with `String.prototype.replace`, which matches the first occurrence anywhere in the path, including inside a longer segment — a checkout under a directory called `src`, or a package whose name appeared earlier in the path, had the wrong segment replaced and the build emitted outside the package. Replacement is now whole-segment and matches from the right.
- A missing or non-array `workspaces` field failed as `undefined.map is not a function`; it now names the file and the field, and the `{ packages: [...] }` form is accepted.
- A non-glob `workspaces` entry was passed down as a bare relative string beside an absolute package path and only worked by accident of `path.resolve`'s argument precedence.
- `typescript` is imported at runtime but was declared only as a dev dependency.

The plugin's helpers are exported and its filesystem, glob, tsconfig and esbuild access is injectable via an optional `WatchWorkspaceDeps` parameter; the existing single-argument call is unchanged. Untyped `any` reads of the workspace package.json and tsconfigs are replaced with narrowed `unknown`.
