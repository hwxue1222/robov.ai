# ROBOV.ai V1

Navigate Knowledge. Expand Your Mind.
找到知识的方向，拓展认知的边界。

## Experience

Describe yourself to create an initial profile and enter a 3D knowledge network
directly. There is no assessment or quiz step.

The Three.js scene shows four connected domains, their concepts, and expanded
branches. Drag to rotate, use the wheel or zoom controls to zoom, and select a
sphere or its label to open that idea. Touch gestures work on mobile. A keyboard
accessible node list remains available, including when WebGL is unavailable.

Each node presents knowledge content and selectable directions for deeper
concepts, applications, boundaries, and connections to other domains. Expanding
a node reveals choices without choosing a branch for the user.

Chinese and English include the interface, content, and knowledge nodes. A
language change preserves the current path and profile. Descriptions retain
their original wording.

Profiles, reflections, expanded branches, and knowledge visits persist in the
current browser. Actual visits update observed breadth and depth, not mastery
scores. Updating a description preserves exploration history. Records can be
cleared in the profile view. Cross-device synchronization is not implemented.

Content uses curated local templates and interest routing, without an AI API.
Branch generation is bounded at three levels before connecting to another field.

## Run

Serve this folder over HTTP because the 3D renderer uses ES modules:

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Production: https://robov.ai.

## Files

- `index.html`: guided entry, profile, and exploration views
- `app.js`: content and exploration modes
- `network.js`: knowledge nodes and selectable branches
- `scene.js`: Three.js rendering, labels, picking, and camera controls
- `profile.js`: profile and local learning history
- `i18n.js`: Chinese and English
- `styles.css`: responsive layout
- `vendor/`: pinned Three.js 0.180.0 modules and MIT license
