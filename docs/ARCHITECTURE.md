# Architecture

## Request flow

```text
Expo frontend
  -> Nginx
  -> Pic-to-Playlist Node API
  -> shared image-analysis API
  -> Spotify API
  -> generated playlist response
```

The static Expo export is deployed to:

```text
/srv/kevin/web/pic-to-playlist
```

The Node API runs from the Pic-to-Playlist checkout and is exposed publicly
only through Nginx. Its production environment is stored outside Git.

## Image-analysis ownership

The canonical image-analysis source belongs to Aesthetic Matcher under
`backend/image-analysis`. A one-way automation copies that source into this
repository at `backend/image-analysis` for local development. This repository
does not deploy the shared GPU service.

## Research and legacy code

`research/label-curation` preserves the original and curated genre lists plus
the tools used to inspect them. `legacy/flask-backend` preserves the older
standalone Pic-to-Playlist inference implementation. Files under
`legacy/deployment-scripts` are disabled historical references and must not be
used for production deployment.

Generated dependencies, build output, native prebuild output, uploaded images,
model caches, and secrets remain outside Git.
