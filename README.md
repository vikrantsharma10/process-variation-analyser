# PIS / M03 — Regional Process Variation Analyser

Part of the **Process Intelligence Suite (PIS / V1.0)** — a set of AI-powered diagnostic tools for operations leaders.

---

## What it does

Takes the same process as it runs across 2–4 regions and tells you:
- Where the variation is intentional versus legacy workaround
- Which market is the outlier and why
- What the binding bottleneck is and what to fix first
- Two structured outputs — one for the process owner; one for executive leadership

No consultant required. Answers in under 60 seconds.

---

## How it works

Seven diagnostic stages run sequentially on each submission:

1. **Process Decomposition** — normalises input into comparable steps
2. **Variance Analysis** — flags the outlier market by TAT deviation
3. **Root Cause Analysis** — assigns reason codes per divergence
4. **CAGE Framework** — tests legitimacy of local variation
5. **Step Classification** — stamps each step: Standardise / Modify / Keep Local
6. **Theory of Constraints** — identifies the single binding bottleneck
7. **Pareto Filter** — surfaces the 20% of fixes delivering 80% of improvement

---

## File structure

```
index.html    — markup only; all sections and result containers
styles.css    — full design system; fonts, layout, components
engine.js     — 7-stage diagnostic prompt and Anthropic API call
ui.js         — region builder, form handling, results renderer, loading state
README.md     — this file
```

---

## Running locally

Open `index.html` directly in a browser. The tool calls the Anthropic API client-side — no server required.

> Note: The API key is handled via the claude.ai artifact proxy when running inside Claude. For standalone deployment you will need to add your own Anthropic API key to the fetch call in `engine.js`.

---

## Design system

- **Background:** `#0f0f0f`
- **Body text:** `#f0f0f0`
- **Accent:** `#c8f135` — used only on CTAs, highlights, active states
- **Fonts:** Instrument Serif (headings) · Inter (body) · JetBrains Mono (labels, tags, data)
- No gradients. No rounded corners. Everything sharp-edged.

---

Built by [Vikrant Sharma](https://www.linkedin.com/in/vikrantsharma10/)
