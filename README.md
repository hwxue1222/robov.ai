# ROBOV.ai V1

ROBOV.ai is a personalized AI private school and cognitive navigation system.

Core flow:

1. Profile Scan
2. Dynamic Cognitive Profile
3. Personal Knowledge Map
4. Knowledge Boundary
5. Next Best Knowledge
6. Topic exploration through DEEPER / EXPLORE / WHY / SO WHAT

First use is a guided Chinese-language journey: describe yourself in free text,
answer three topic-specific questions, review your starting point, then begin a
lesson with an explicit next step. Interests route by local keyword rules.
The initial assessment reports actual correct-answer counts, not invented scores.

Each topic has three lesson stages. Stage concepts expand into connected knowledge
nodes with explanations, application exercises, boundaries, and clickable paths.
There are four topic networks; users can deepen a branch or cross into an adjacent
topic. Repeated expansion reuses existing nodes. Learning reflections remain in
memory during the current session.

Expansion reveals branch choices without automatically selecting a child. Users
choose which idea to follow, including practical applications, conditions, and
connections to other fields. Content is presented at each node, not as a report.

The Chinese / English switch translates the full interface, assessment, lesson
content, and knowledge nodes while preserving current answers and expanded paths.
User-written descriptions are kept in their original language. Only the language
preference is stored locally.

Content is generated instantly from curated local templates and the user's
description. This version does not call an AI service or persist personal data
across page reloads. Branch generation is bounded at three levels, then connects
to an adjacent topic.

Brand copy:

- ROBOV.ai
- Navigate Knowledge. Expand Your Mind.
- 找到知识的方向，拓展认知的边界。

## Run locally

This V1 is a static prototype, so it can run without installing dependencies.

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Files

- `index.html` - product structure and first-use flow
- `styles.css` - responsive visual system
- `app.js` - demo data and interactive behavior
- `network.js` - expandable knowledge nodes and connections
- `i18n.js` - complete Chinese / English content and language switching
