# four-site

The website of [four](https://github.com/Alejo-end/four), a live sampler for norns. The
case assembles as you scroll, turns its screen to you and switches on. Then four is
explained page by page, with its real screens.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # the static site in dist/
```

## The two parts you can reuse

- `<four-screen clip="take">` plays four's real screen frames. `setClip`,
  `setPlaylist`, `play`, `pause`, and a `canvas` for other uses. `src/four-screen.ts`.
- `<four-device>` is the case in three.js. Set `progress` (0 exploded, 1 assembled and
  lit) and `shift` (0 centred, 1 in the left half), and give it a screen canvas.
  `src/four-device.ts`.

## Where the assets come from

- `public/clips/` are rendered by four itself: `tools/clips.sh` runs
  `test/uisim/export_clips.lua` in the four repo (set `FOUR_DIR`).
- `public/model/case.glb` is built from the case's CAD project, which is private, by a
  local script kept out of this repository (`tools/private/`, git ignored). It runs FreeCAD,
  then `tools/optimise_model.mjs` (glTF-Transform) and `tools/check_model.mjs`.
- `src/font.json` is four's pixel font: `FOUR_DIR=../mangler node tools/font.mjs`.

## Deploy

`.github/workflows/pages.yml` builds on every push to `main` and publishes with GitHub
Pages. It sets `BASE` to the repository name.

## License

GNU General Public License v3, like four.
