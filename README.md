# Shiny Hunt Counter (web)

A small offline-capable web app for tracking shiny hunt encounters — the web
version of the desktop `pokemon-counter` Tkinter app. Pick a target by dex
number or name, see its shiny sprite, and tap to count encounters. Everything is
saved in your browser, so you can leave and come back mid-hunt.

**Live:** https://thames1000.github.io/pokemon-encounter-tracker/

## Features

- Target any National Dex Pokemon #1–905 by number or name (with autocomplete).
- Big tap target for fast counting; **Space / Enter / ↑** also adds one, **↓** subtracts.
- Live shiny odds line — cumulative chance of a shiny by your current count, for
  common odds (1/8192, 1/4096, charm, Masuda, etc.) or a custom value.
- Multiple saved hunts; switch between them or delete them.
- **Found!** celebration and one-tap reset.
- Installable as a PWA (works offline; shiny sprites cache as you view them).
- **Import / Export** a `hunt_log.json` that is compatible with the desktop app.

## Hosting on GitHub Pages

This is a static site — no build step. To publish:

1. Push this folder to a GitHub repo.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, branch `main`, folder `/ (root)`.
3. Wait a minute; your site appears at
   `https://<username>.github.io/<repo>/`.

The `.nojekyll` file keeps GitHub Pages from reprocessing the assets.

## Credits

Shiny sprites are the ones bundled with the desktop counter (originally pulled
from Serebii). Names sourced from PokeAPI.
