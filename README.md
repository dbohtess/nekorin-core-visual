# Nekorin Core Visual

Experimental **visual-only WebGL renderer** for Nekorin AI.

## Goal
Build and refine the approved Nekorin Core visual before integrating it into the private Nekorin AI project.

## Current renderer
- Three.js / WebGL
- Additive blending
- UnrealBloomPass
- Large asymmetric outer memory paths
- Glowing moving memory nodes
- Clean particle-based center
- **No central spiderweb / lattice / polygon mesh**
- **No concentric technical rings in the center**
- `M` spawns one new persistent memory node
- `ESC` pauses/resumes animation

## Single source of truth
The live page uses only:

```text
index.html
app.js
style.css
```

Old renderer versions are intentionally removed to prevent the browser or Codespaces from loading the wrong visual.

## Run in GitHub Codespaces
From the repository root:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open forwarded **port 8000**.

The bottom-left label should read:

```text
CLEAN MASTER
```

No private Nekorin memory, JSON memory files, personal data, agent logic, or secrets belong in this repository.
