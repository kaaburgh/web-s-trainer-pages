# SET Lab — public distribution

This repository publishes **only the static web application**, without the development repository's private Git history, tests or CI configuration.

**Site:** https://kaaburgh.github.io/web-s-trainer-pages/

## Enable GitHub Pages (one-time)

Open [Settings → Pages](https://github.com/kaaburgh/web-s-trainer-pages/settings/pages). Under **Build and deployment**, select **Deploy from a branch**, set the branch to **main** and the folder to **/docs**, then save. Publishing updates to `docs/` will automatically republish the site.

The application supports iPhone home-screen installation in Safari and offline operation after its assets have been cached. No backend is required.

## Automatic updates from the private source

The development repository `kaaburgh/web-set` contains the publisher workflow. To activate automatic syncing after the feature PR is merged, create an Actions repository secret named `PUBLIC_PAGES_TOKEN` in **the private source repository**. Use a **fine-grained personal access token** scoped to **only** `kaaburgh/web-s-trainer-pages`, with `Contents: Read and write`. The workflow copies the allowlisted static assets into `docs/`; it cannot expose other files.

The initial public snapshot was copied from source commit `b3bdea44c6b12d6f50280024097a008b2f361150` on `feat/set-lab-pwa`.

## Independent project

SET Lab is an independent practice application for SET-style card puzzles. It is not affiliated with, endorsed by, or sponsored by PlayMonster. All visual assets and application code are independently implemented.
