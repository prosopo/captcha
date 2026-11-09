---
"@prosopo/types": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Accept behavioural data up to 512 KB on captcha answers. The cap was 128 KB. A visitor who moves around the page for a while fills the widget's behaviour buffers, and the encrypted data then goes over 128 KB. Their image answer was rejected with a 400, and the widget started a new challenge straight away. They could not get past the captcha. On 9 Nov, 502 of the 537 rejected image answers in 24 hours were over the old cap. A full buffer is about 340 KB, so the new cap leaves room to spare.

The provider now also logs refused captcha answers at info, with the error site and the length of each field, so the next cause like this shows up in the logs.
