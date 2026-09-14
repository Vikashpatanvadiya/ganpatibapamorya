# Ganpati Bappa

Single-page Ganpati aarti/bhajan player. Static files only — no build step.

```
index.html          page + <head> metadata (OG/Twitter)
styles.css          styling (mobile-first)
assets/             background + lock-screen cover, made from backgroundimage.png
assets/covers/      square song covers (from images/), picked at random per song —
                    add more and list them in CONFIG.covers in app.js
app.js              player, playlist tabs, links, online counter
playlist.js         categories + track titles (generated/merged from Songs/)
Songs/<Folder>/     the audio, one folder per playlist
tools/serve.mjs     local server with Range support (for seeking)
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

## Still to fill in

- `opengraph.png` (1200×675) at the site root
- YT Music URL → `CONFIG.links.ytMusic` in `app.js` (button is hidden until set)
- Real online count → `CONFIG.onlineEndpoint` (otherwise simulated)
# ganpatibapamorya
