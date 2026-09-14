# Ganpati Bappa

Single-page Ganpati aarti/bhajan player. Static files only — no build step.

```
index.html          page + <head> metadata (OG/Twitter)
styles.css          styling (mobile-first)
assets/             background + lock-screen cover, made from backgroundimage.png
assets/covers/      square song covers (from images/), picked at random per song —
                    add more and list them in CONFIG.covers in app.js
app.js              player, playlist tabs, links, online counter
api/online.js       Vercel Function behind the live "N online" counter (Upstash Redis)
playlist.js         categories + track titles (generated/merged from Songs/)
Songs/<Folder>/     the audio, one folder per playlist
tools/serve.mjs     local server with Range support + an in-memory /api/online
tools/sync-playlist.mjs
```

## Run locally

```bash
node tools/serve.mjs
```

Open http://localhost:8080 — link straight to a playlist with `#aarti`, `#morning`, `#garba`, …

## Adding songs

Drop MP3s into a folder under `Songs/` (a new folder becomes a new playlist), then:

```bash
node tools/sync-playlist.mjs
```

New files get a guessed title and an empty artist — tidy them in `playlist.js`.
Existing titles, order, labels and blurbs are kept.

**Long mixes (like Garba):** compress before adding — GitHub rejects files over 100MB and every
listener downloads the whole file. Keep the original in `Songs-originals/` (not uploaded) and add a
96 kbps copy with a short, plain file name:

```bash
ffmpeg -i "Songs-originals/Garba/Some Long Mix.mp3" -vn -map_metadata -1 -c:a aac -b:a 96k -ac 2 -movflags +faststart Songs/Garba/some-long-mix.m4a
```

## Replacing the background

`backgroundimage.png` is the source; the site loads the compressed copies in `assets/`.
After swapping the painting, regenerate them (the crop keeps Ganesha centred on phones):

```bash
ffmpeg -y -i backgroundimage.png -vf "crop=760:929:210:0" -quality 78 assets/bg-portrait.webp
ffmpeg -y -i backgroundimage.png -vf "crop=760:929:210:0" -q:v 5 assets/bg-portrait.jpg
ffmpeg -y -i backgroundimage.png -quality 78 assets/bg-wide.webp
ffmpeg -y -i backgroundimage.png -q:v 5 assets/bg-wide.jpg
ffmpeg -y -i backgroundimage.png -vf "crop=640:640:280:120,scale=512:512" -q:v 4 assets/cover-512.jpg
```

## Live "online" counter (Vercel)

Every open page pings `/api/online` every 30s; anyone seen in the last 90s counts.
The count lives in a free Upstash Redis database:

1. Vercel dashboard → your project → **Storage** → **Create Database** → **Upstash for Redis** (free plan) → connect it to this project.
   This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to the project's environment variables.
2. Redeploy (push to `main`, or **Deployments → Redeploy**).
3. Check `https://<your-site>/api/online` — it should return `{"online":0}` or more.

Until the database is connected the counter pill stays hidden (no fake numbers).

## Page-view analytics (Vercel)

`index.html` already loads Vercel Web Analytics. Turn it on in the Vercel dashboard →
project → **Analytics** → **Enable**. (The `@vercel/analytics` npm package is only needed for
React/Next.js apps.) Note: this shows visits in the dashboard; it can't feed the live counter.

## Still to fill in

- `opengraph.png` (1200×675) at the site root
- YT Music URL → `CONFIG.links.ytMusic` in `app.js` (button is hidden until set)
