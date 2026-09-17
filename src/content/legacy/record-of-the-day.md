---
title: 'Record Of The Day: Discovering Essential Music'
category: 'Project'
pubDate: '2025-07-17'
---

Do you like discovering new music?

While Spotify and other music streaming platforms are constantly improving their recommendation systems, it's hard to beat a hand-curated playlist in terms of rare, enigmatic finds.

This was my realization when I came across [Tom Moon's 1,000 Recordings to Hear Before You Die](https://en.wikipedia.org/wiki/1,000_Recordings_to_Hear_Before_You_Die). It's an eclectic collection of albums across every genre and time period that I became obsessed with.

[Listen to the changing playlist on Spotify](https://open.spotify.com/playlist/42nArFgYJDbc0f6VzHfCdZ).

To learn a new language (F#) and explore this new music catalogue, I decide to create a script that mutates a Spotify playlist daily with the next record. This way I could 'pin' the playlist once, and there would be a new album waiting for me each day.

---

## How it works

1. Selects the next album from Tom Moon's list [(album index)](https://open.spotify.com/playlist/4KQDdglJ7HGcqNozbJTlM3)
2. Fetches the album's tracks and metadata from the Spotify Web API
3. Overwrites the target playlist with the new tracks
4. Renames the playlist with the album title and release info

Everything is handled via the Spotify Web API using a scheduled GitHub Action!

---

Check out the repo!

[View Record of the Day on GitHub](https://github.com/NathanPannell/record-of-the-day)
