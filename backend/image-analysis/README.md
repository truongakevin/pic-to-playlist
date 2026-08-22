# Image analysis

This directory contains the production image-analysis source used by Aesthetic
Matcher and Pic-to-Playlist. It was copied unchanged from the Linux production
runtime during the repository restructure.

Aesthetic Matcher is the canonical owner and the only repository that deploys
the shared Linux service. Pic-to-Playlist receives a synchronized source copy
for local development.

Production runs through Gunicorn with one worker and one inference request at
a time. This keeps the shared 8 GB GPU from loading duplicate model processes
or processing simultaneous Aesthetic Matcher and Pic-to-Playlist requests.

Production configuration, model caches, Python environments, and uploaded
images remain outside Git.
