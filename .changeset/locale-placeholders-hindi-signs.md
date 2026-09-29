---
"@prosopo/locale": patch
---

Hindi text is readable again. A bulk edit in July 2025 had stripped every vowel sign from 410 of the 444 Hindi strings, so the widget said "म मनषय ह" instead of "मैं मनुष्य हूँ". The originals are restored, and the 14 strings added since then are translated properly. The Finnish, Hindi and Dutch "can't find keyring pair" messages had also translated their `{{address}}` placeholder, so the address was never filled in; that is fixed too. New tests check that every locale keeps all of the English placeholders, and that Hindi strings keep their vowel signs.
