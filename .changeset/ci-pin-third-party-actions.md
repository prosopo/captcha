---
---

Third-party GitHub Actions are now pinned to full commit SHAs instead of mutable tags (the tag stays as a trailing comment). A moved or compromised tag would otherwise run new code with whatever the step holds — here the release GitHub App private key (workflow-application-token-action), Docker Hub and AWS credentials, and write tokens. First-party `actions/*` and `github/*` are left on tags.
