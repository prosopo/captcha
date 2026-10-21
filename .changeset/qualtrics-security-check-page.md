---
---

Add a hosted Procaptcha security check page for Qualtrics surveys, served from
`https://js.prosopo.io/integrations/qualtrics.html`.

A survey links to the page with its site key and anonymous survey link. The page
shows the widget and, once the respondent passes, sends them back to the survey
with a `procaptcha_token` query parameter for the survey's Web Service element to
verify. It only redirects to `https://*.qualtrics.com/jfe/form/SV_...` links and
refuses to run inside a frame.
