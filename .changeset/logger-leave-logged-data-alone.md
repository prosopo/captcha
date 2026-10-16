---
"@prosopo/logger": patch
---

Logging an object no longer changes it. The logger converted bigints to strings by rewriting the logged record in place, and the record holds the caller's own objects, so any bigint inside something that was logged (an IP held as a bigint pair, for example) came back as a string afterwards. Serialisation now happens through a JSON replacer and leaves the caller's data untouched.

Two related crashes are fixed at the same time. Logging data with a circular reference, or an error whose `cause` chain loops back on itself, overflowed the stack inside the logger and threw from the logging call. Both now print `"[Circular]"` at the repeated reference.
