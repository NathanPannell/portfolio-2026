---
title: 'Two Lessons From Owning a Production API at ICBC'
category: 'Writing'
pubDate: '2025-12-12'
description: 'What I learned from porting, shipping, instrumenting, and maintaining a production API.'
---

I spent eight months at ICBC porting a production .NET API over to Java. Beyond the port, I owned the thing end to end: deployed it to production, maintained it, and instrumented it. Two lessons came out of that ownership, and they both scale down to a two-person startup as cleanly as they scaled up to a large org.

---

## Lesson 1: The best dashboards come from the people who built the product

I built logging into every app I touched this term. Audit logs formatted for compliance ingestion, Log4j filters that captured traffic automatically, Splunk queries, Dynatrace monitors. Most of it felt like overhead while I was writing it.

One piece started small: a Splunk dashboard for the API I was building, so I could check whether a deploy went out healthy. I used it a dozen times for exactly that. Then it caught a real problem. Three percent of users suddenly couldn't log in, and the dashboard flagged it fast. Over the next few days, as fixes went in, I watched the error rate fall on the same charts. I published it with a Splunk expert on the team, and it became the first place people looked when the app misbehaved.

The reason it worked is that I built it for a product I knew inside out. I already knew which signals mattered, which failure modes were plausible, and what a healthy deploy looked like. Compare that to being handed a service you've never touched and asked to build a dashboard for an executive: you end up guessing at what belongs on it.

Observability is only as good as your understanding of the system underneath, and the person maintaining the product is usually the one who can see what's worth watching. Wire that visibility in early, while the product is still fresh in your head.

---

## Lesson 2: Learn the codebase yourself, even when AI could do it for you

A new codebase is slow at first. You don't know where anything lives, and handing every task to an AI assistant to navigate for you feels like the obvious move. It works for a while, especially for throw-away experiments.

Familiarity compounds, though. After five months in the same codebase, I could look at an error message or a visual glitch and know the cause and the fix on sight, because the whole system was mapped in my head. No searching, no re-deriving context, no prompt to write. Humans have pretty large context windows too, and the one you carry a codebase in is faster to query than anything you have to re-explain to a tool every time.

There's a second payoff: you can stand behind the change instead of taking the model's word for it. Leaning entirely on AI early skips the slow stretch that builds that map, and the map is what makes you fast later. It's worth doing enough of the work yourself that the system ends up stored in your own head, especially in sensitive production systems.

---

Neither lesson is specific to insurance software or a large company. Visibility and a deep grasp of your own system are what let you move on it with confidence, at any scale.
