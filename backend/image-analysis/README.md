# Image analysis

This directory contains the production image-analysis source used by Aesthetic
Matcher and Pic-to-Playlist. It was copied unchanged from the Linux production
runtime during the repository restructure.

Aesthetic Matcher is the canonical owner and the only repository that deploys
the shared Linux service. Pic-to-Playlist receives a synchronized source copy
for local development.

Production configuration, model caches, Python environments, and uploaded
images remain outside Git.
