---
"@prosopo/locale": patch
---

The audio captcha's text (play button, instructions, error messages and so on) is now translated into all 92 languages. Before this it showed in English everywhere. The catalogue test had a special exemption for these strings, so nothing flagged it. That exemption is gone: any string left in English now fails the test, unless it is on the short list of words that really are the same in that language (brand names, loanwords, "OK").

Some Filipino animal and object names and two Filipino/Scots error messages were on that list without being real loanwords. They are now translated too.

Every translation still needs checking by a native speaker.
