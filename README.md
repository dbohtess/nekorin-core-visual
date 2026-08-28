# Nekorin Core Visual

Experimental **visual-only WebGL renderer** for Nekorin AI.

## Goal
Match the approved Nekorin Core reference visually first. Integration with the private Nekorin AI project comes later.

## Current renderer
- Three.js / WebGL
- Additive blending
- UnrealBloomPass
- Dense central neural/energy mesh
- Thin technical rings
- Large asymmetric orbital paths
- Glowing memory nodes
- `M` spawns a new persistent memory node
- `ESC` pauses/resumes animation

## Run in GitHub Codespaces
From the repository root:

```bash
python3 -m http.server 8000
```

Then open the forwarded **port 8000** from the Ports tab.

## Structure
```text
nekorin-core-visual/
├── index.html
├── app.js
├── style.css
├── main.py              # old ModernGL experiment
├── shaders/             # old ModernGL experiment shaders
├── assets/
├── experiments/
└── README.md
```

No private Nekorin memory, JSON memory files, personal data, agent logic, or secrets belong in this repository.
