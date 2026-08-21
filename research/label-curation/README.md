# Genre label curation

This directory preserves the manual genre-label refinement work used by Pic to
Playlist image analysis.

- `genres-original.py` contains 6,298 unique labels.
- `genres-curated.py` contains the 5,660-label production set.
- `sort.py` is the interactive terminal curation tool.
- `testapp.py` is an early CLIP label-ranking experiment.

Active runtime labels are maintained with the canonical image-analysis backend
in the Aesthetic Matcher repository.
