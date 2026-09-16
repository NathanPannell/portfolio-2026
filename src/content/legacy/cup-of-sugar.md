---
title: 'Cup of Sugar: Optimizing Food Bank Donations'
category: 'Project'
pubDate: '2026-01-31'
---

Ever throw out food because you didn't know who needed it?

That's the gap Cup of Sugar tries to close. Stores and restaurants have too much perishable food, food banks have specific needs, and nothing connects the two. Every organization tracks inventory differently, nobody updates a form daily, and edible food ends up in the trash while people go hungry.

[Watch the demo on YouTube](https://youtu.be/bc9goVMAmgs)

---

## How it works

1. Food banks list their inventory as CSV or plain text. Donors describe their excess food the same way, in whatever format is easiest.
2. Supabase stores the data, and the Gemini API parses the messy inputs into a structured picture of what's needed and what's on offer.
3. The system compares donations against food bank requirements and surfaces the best match.
4. Contact info gets shared so both sides can coordinate the handoff directly.

---

## Who it's for

- **Food banks**, who need a reliable way to communicate specific inventory needs instead of one more form nobody fills out.
- **Restaurants**, with excess food to move quickly and ethically.
- **Farmers**, who need to route large amounts of produce to the right places.

---

## Stack

- Frontend: React / Vite
- Backend: Python / Flask
- Database: Supabase
- AI: Gemini API
- Build: Containerized via Docker

Check out the repo!

[View Cup of Sugar on GitHub](https://github.com/NathanPannell/cup-of-sugar)
