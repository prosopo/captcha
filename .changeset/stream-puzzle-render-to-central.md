---
"@prosopo/database": patch
---

Copy each puzzle's render inputs (piece size, board size, decoy settings and the two seeds) to the central database, so the portal can redraw the exact puzzle a user was served.

The inputs are added to the local record after it has first been sent to central. The follow-up update re-read the record with a fixed list of fields that left them out, so no central puzzle record ever had them. The update stream now asks for them as well. Every other read is unchanged, so verify still never touches them.

The seeds rebuild the clean background and give away the answer. The portal's audit API strips them for everyone except superadmins, and only returns them once a puzzle can no longer be solved (prosopo/captcha-private#5719). That change has to be deployed before this one.
