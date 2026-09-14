// Rebuilds playlist.js from the Songs/ folders.
// Keeps titles/artists you've already edited, adds new files with a guessed title,
// drops files that no longer exist, and appends any new folder as a new category.
// File names are written in Unicode NFC — the form git stores on macOS and the form
// Linux hosts like Vercel serve — so names with accents (e.g. "ā") still load online.
//
//   node tools/sync-playlist.mjs

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const songsDir = path.join(root, "Songs");
const playlistPath = path.join(root, "playlist.js");
const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav)$/i;
const nfc = (s) => s.normalize("NFC");

const sandbox = { window: {} };
if (fs.existsSync(playlistPath)) {
  vm.runInNewContext(fs.readFileSync(playlistPath, "utf8"), sandbox);
}
const existing = sandbox.window.PLAYLIST ?? [];

const folders = fs
  .readdirSync(songsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const guessTitle = (file) =>
  file.replace(AUDIO, "").split(/\s{2,}| - /)[0].replace(/_/g, " ").trim();

const categories = [];
const seen = new Set();

const buildTracks = (folder, known = []) => {
  const byName = new Map(known.map((t) => [nfc(t.file), t]));
  const files = fs.readdirSync(path.join(songsDir, folder)).filter((f) => AUDIO.test(f));
  const onDisk = new Map(files.map((f) => [nfc(f), f]));
  // Existing order first, then new files alphabetically.
  const kept = known
    .filter((t) => onDisk.has(nfc(t.file)))
    .map((t) => ({ ...t, file: nfc(onDisk.get(nfc(t.file))) }));
  const added = files
    .filter((f) => !byName.has(nfc(f)))
    .sort()
    .map((f) => ({ file: nfc(f), title: guessTitle(nfc(f)), artist: "" }));
  added.forEach((t) => console.log(`+ ${folder}/${t.file}`));
  known
    .filter((t) => !onDisk.has(nfc(t.file)))
    .forEach((t) => console.log(`- ${folder}/${t.file}`));
  return [...kept, ...added];
};

for (const cat of existing) {
  const folder = folders.find((f) => nfc(f) === nfc(cat.folder));
  if (!folder) {
    console.log(`- category "${cat.label}" (folder ${cat.folder} missing)`);
    continue;
  }
  seen.add(folder);
  categories.push({ ...cat, folder, tracks: buildTracks(folder, cat.tracks) });
}

for (const folder of folders.filter((f) => !seen.has(f)).sort()) {
  const label = folder.charAt(0).toUpperCase() + folder.slice(1);
  console.log(`+ category "${label}"`);
  categories.push({
    id: folder.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    blurb: "",
    folder,
    tracks: buildTracks(folder),
  });
}

const j = JSON.stringify;
const out =
  "window.PLAYLIST = [\n" +
  categories
    .map(
      (c) =>
        `  {\n    "id": ${j(c.id)},\n    "label": ${j(c.label)},\n    "blurb": ${j(c.blurb ?? "")},\n    "folder": ${j(c.folder)},\n    "tracks": [\n` +
        c.tracks
          .map((t) => `      { "file": ${j(t.file)}, "title": ${j(t.title)}, "artist": ${j(t.artist ?? "")} }`)
          .join(",\n") +
        "\n    ]\n  }"
    )
    .join(",\n") +
  "\n];\n";

fs.writeFileSync(playlistPath, out);
console.log(`playlist.js: ${categories.length} categories, ${categories.reduce((n, c) => n + c.tracks.length, 0)} tracks`);
