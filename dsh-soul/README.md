# @opendsh/dsh-plugin-soul

> 让 DSH 变得有人格、有灵魂、懂情绪，越用越懂你。

A DSH web plugin that gives the AI a **personality**, a **soul**, **emotional intelligence**, and the ability to **learn about you over time**.

## Features

### 🎭 Personality Traits
Tune six core personality dimensions with intuitive sliders:
- **Warmth** — clinical ↔ warm
- **Humor** — serious ↔ playful
- **Formality** — formal ↔ casual
- **Verbosity** — terse ↔ thorough
- **Empathy** — task-focused ↔ deeply empathetic
- **Proactivity** — reactive ↔ proactive

### 🪐 Persona
Give the AI a name, a tagline, an avatar emoji, and a description — a soul that makes it feel like a companion, not just a tool.

### 👤 User Profile
The AI maintains a profile of what it has learned about you:
- Your name and preferred language
- Technical level (beginner → expert)
- Communication style preferences
- Interests and focus areas

### 🧠 Learned Preferences
Preferences the AI picks up from your interactions — each with a confidence score that grows as patterns are reinforced. You can view, add, and remove them.

### 💗 Emotional Memory
Record and track emotional states over time:
- Emotion type and intensity
- Optional context notes
- Rolling window of recent observations
- Statistics: dominant emotion, average intensity, trend (improving/stable/declining)

### ✨ Insights
A living dashboard showing how well the AI knows you:
- **Familiarity score** — grows as the profile enriches
- **Days active** and **interaction count**
- **Top preferences** by confidence
- **Dominant emotion** and trend
- A natural-language summary of what the AI has learned

## Architecture

| File | Role |
|---|---|
| `src/index.ts` | Server entry — opens `soul` storage domain, mounts `SoulStore` + `SoulRuntime` |
| `src/domain.ts` | Storage domain declaration (`soul` table) |
| `src/types.ts` | Zod schemas + TypeScript types for the soul record |
| `src/schemas.ts` | Wire-validation schemas shared between server and client |
| `src/store.ts` | Durable store — singleton soul record, emotion log, preference management |
| `src/runtime.ts` | Typert host service (`ctx.soul`) — RPC methods |
| `src/typert.ts` | Host TYPERT manifest — `soul/*` endpoint declarations |
| `src/client/index.ts` | Client entry — mounts remote, locale, settings section |
| `src/client/remote.ts` | Client-side typed remote surface |
| `src/client/typert-remote.ts` | Client TYPERT contribution |
| `src/client/locales.ts` | i18n dictionaries (zh + en) |
| `src/client/SoulSettings.tsx` | Settings panel React component |
| `src/client/styles.ts` | Injected CSS styles |

## Installation

### Local development

1. Add to DSH `package.json` dependencies:
   ```json
   "@opendsh/dsh-plugin-soul": "file:/path/to/dsh-soul"
   ```

2. Add to the `bundles` list:
   ```json
   "@opendsh/dsh-plugin-soul"
   ```

3. Run `pnpm install`

4. Build the plugin:
   ```bash
   cd dsh-soul && pnpm run build
   ```

5. Verify `lib/client.js` and `cordis.patch.yml` are in place

6. Restart `dsh web` — the "Soul" section appears in Settings

## License

MIT
