---
"@prosopo/cli": patch
---

Download the provider image's GeoLite2 databases from the publisher's `download` branch on raw.githubusercontent.com instead of via git.io, which redirects to GitHub release assets. Those returned 504 for hours on 8 Nov and broke the provider image build. The files are the same.
