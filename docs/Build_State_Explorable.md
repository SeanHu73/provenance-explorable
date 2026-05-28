# Build State — Provenance Explorable

*Handoff document for Claude Code sessions on the explorable project.
Last updated 2026-05-28.
Read this instead of re-discovering the codebase.*

---

## 0. Project Context

A **single-player** GPS-based place-based learning experience built on
the Provenance Next.js + Firebase scaffolding. Players walk a real
physical site (currently Stanford), discover stops as they enter
their detection radius, collect evidence, and ultimately sort that
evidence against an author's assessment to learn **historical
contextualisation**.

**Repo:** `github.com/SeanHu73/provenance-explorable`

**Deployed:** `https://provenance-explorable.vercel.app/`

**Earlier directions that were dropped:**
- 8-bit isometric pixel-art map (replaced by Google Maps Hybrid)
- Two-player room system with character avatars (deferred — currently single-player)

---

## 1. Architecture

- **Next.js 16 App Router** + TypeScript + Tailwind v4
- **Framer Motion** for animations
- **@vis.gl/react-google-maps** for the bounded campus map
- **@dnd-kit/core** for drag-and-drop in the evidence sort screen
- **TipTap** (`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-text-style` + `@tiptap/extension-color` + custom font-size mark) for the rich text editor
- **Firebase Firestore** for stops + game config
- **Firebase Storage** for photo / audio assets
- **Deployed on Vercel**

### Key abstraction: in-memory player progress

`useProgress` in `src/lib/explorable/discovery.ts` holds the whole
player session state in React state — **resets on every refresh**.
Multi-session persistence was deliberately removed; bring it back via
sessionStorage / Firestore-room if needed.

State held:

| Field | Purpose |
|---|---|
| `collectedIds` | stops the player has reached the "Collected" screen of |
| `indoorRevealed` | whether the indoor-prompt "Yes I'm inside" has been tapped |
| `verdicts` | per-stop `'context' \| 'trash'` from midway + final sorts |
| `sortedStopIds` | stops that have been through any sort screen |
| `revealResponses` | per-stop `{ agreed, reason? }` from the reveal sequence |

---

## 2. Access points

| URL | Purpose |
|---|---|
| `/explorable` | The game. Bounded Stanford map, live GPS, player marker, journal, lesson, sorts, reveal. |
| `/explorable?devloc=1` | Same, but forces the dev location override panel and the bottom-right dev menu to appear regardless of environment. |
| `/admin/explorable` | Game-level authoring: essential question, background photo, map bounds, indoor triggers, contextualisation explainer screens, lesson preview. |
| `/admin/explorable/stops` | Stop list. Add / open / delete stops. |
| `/admin/explorable/stops/new` | New stop editor (redirects to `/[id]` on first auto-save). |
| `/admin/explorable/stops/[id]` | Edit an authored stop. |
| `/admin/explorable/overview` | Full-screen map showing every authored stop, numbered, with a legend. Add `?bare=1` for a chromeless screenshot view. |
| `/admin` | Legacy Provenance admin (still functional, untouched). Nav linked to the explorable admin. |
| `/` | Legacy Provenance home (untouched). |

---

## 3. Data model

### Firestore collections

| Collection | Doc shape | Notes |
|---|---|---|
| `explorable-stops` | `ExplorableStop` (see `src/lib/explorable/stop-types.ts`) | Per-stop content |
| `explorable-config` | `ExplorableConfig` singleton at doc id `main` | Game-level settings |

**Firestore rules** must include match blocks for both collections — currently `allow read, write: if request.time < timestamp.date(2026, 6, 26);`.

**Storage rules** must allow uploads to `/explorable/photo/...` and `/explorable/audio/...` — same time-bounded rule applied to the bucket.

### `ExplorableStop` highlights

- `id`, `title`
- `location: { lat, lng }` — set via click-to-place in admin
- `isIndoor: boolean` — bypasses GPS discovery
- `indoorMap?: { photoUrl, pinX, pinY }` — uploaded photo + click-to-place pin (percentages 0–100)
- `notice: { prompt, timerSeconds, photos[], audio? }`
- `context: { text, photos[], audio? }`
- `puzzlePiece: { photoUrl?, label? }` — falls back to first notice photo / stop title
- `authorAssessment: { included, explanation }` — author's verdict, shown in the reveal sequence

### `ExplorableConfig`

- `essentialQuestion: string`
- `backgroundPhotoUrl: string | null` — frosted-glass card surface behind every lesson / stop / sort screen
- `bounds: { north, south, east, west }` — hard pan boundary for the player map (defaults to `STANFORD_BOUNDS`)
- `buildingTriggers: BuildingTrigger[]` — hidden geofences that gate the "I'm inside" indoor prompt
- `explainerScreens: Screen[]` — authored lesson content (text screens + multiple-choice question screens)

---

## 4. Player flow

```
[Page loads at /explorable]
  ↓
Bounded Stanford Hybrid map. Live GPS player marker (blue) or fake-GPS (orange).
  ↓
Player walks toward a stop.
  ↓                                       ─── distance ───
  • > 30 m            no halo
  • 15–30 m           BLUE edge halo, pulses, intensifies as they close
  • ≤ 15 m            GREEN edge halo. Red pin appears on map, pulsing.
  ↓
Tap pin → StopCard (full-screen translucent over background photo)
  ↓
Snap-scroll: Notice (audio at top, prompt, photos, optional timer)
            → Context (audio at top, text, photos)
            → Collected (puzzle piece animates in)
  ↓
"Back to the map" — pin is now BLUE (collected).
  ↓
Player crosses into a building's trigger zone (admin-authored geofence)
  ↓
  Sticky prompt appears: "Are you inside Memorial Church?" (one-shot)
  Tap "Yes" → indoor pins reveal as RED pins anywhere, prompt gone forever this session
  ↓
[Player keeps collecting]
  ↓
4th stop collected (AUTO_EXPLAINER_THRESHOLD)
  ↓
After they return to map → "Learn about contextualising" interstitial
  ↓
Tap "Begin lesson" → ContextualisationExplainer (snap-scroll over background photo)
  ↓
  Authored screens (text / question screens with per-option presentations + buttons)
  → Essential Question screen at the end (always appended)
  → Tap × to close
  ↓
MidwaySort auto-opens (because explainer was auto-fired and no sort yet done)
  ↓
  EQ pinned at top. Two drop zones: Context | Trash. Drag every collected
  piece. Continue.
  ↓
[Back to map; player collects more]
  ↓
All stops collected
  ↓
After they return to map → "Review your evidence" interstitial
  ↓
Tap "Begin review" → FinalSort (only the stops not sorted at midway)
  ↓
  Sort. Continue → RevealSequence opens.
  ↓
RevealSequence walks the disagreements one card at a time:
  • RED halo    author would EXCLUDE, player put in Context
  • YELLOW halo author would INCLUDE, player did not
  ↓
  Tap card → 3D flip → author's reasoning on the back
  ↓
  After flip: "I agree" / "I disagree" buttons appear
    • Agree → records, advances to next card
    • Disagree → textarea slides in (use phone keyboard mic to dictate) → Save & next
  ↓
End of reveal → "Done" → close
```

### Manual controls

- **Journal** button (bottom-centre) — sheet listing every collected piece. Tap a piece to re-open its StopCard. Top of the sheet has **Finish the tour** button → opens FinalSort directly.
- **Dev** button (bottom-right, small, dev-mode only) — expands to four shortcuts: Lesson preview, Midway sort, Final sort, Reveal. Falls back to all authored stops if collected is empty so the screens are demonstrable from a clean session.
- **Dev location panel** (top-right, dev-mode only) — toggle Fake GPS, tap map to set position.

---

## 5. Admin authoring

`/admin/explorable` is the game-level editor:

- **Essential Question** — textarea, auto-save 1s debounce
- **Background Photo** — single-photo upload via Vercel API route
- **Map Bounds** — 4 lat/lng inputs (N/S/E/W) + "Reset to Stanford default"
- **Indoor Triggers** — click on a bounded Stanford map to drop a hidden geofence; list below with editable name + radius (default 20 m) + delete. Collapsible header.
- **Contextualisation Explainer** — list of authored screens, "+ Text screen" / "+ Question screen". Each screen has a rich text body and optional image/GIF. Question screens have per-option `tag`, `presentationHtml` (the long-form screen shown before the choice) and `responseHtml` (shown after tapping). Exactly one option per question can be "Correct". "Preview" button plays the live experience.

`/admin/explorable/stops/[id]` is the per-stop editor:

- Title + **Indoor?** checkbox
- **Indoor map** (only when Indoor is ticked) — upload an image, click anywhere on it to place a pin. Pin uses `translate(-50%, -50%)` so its centre lands exactly on the click.
- Location (click-to-place Stanford map)
- Notice (prompt, timer in seconds, photos, audio)
- Context (text, photos, audio)
- Puzzle piece (photo URL override, label override, live preview)
- Author's evidence assessment (include / exclude radio + explanation)
- Delete

All forms auto-save with a 1s debounce; status indicator at the top.

### Rich text editor

`src/components/explorable/admin/RichTextEditor.tsx`. TipTap-based.
Toolbar: B, I, color dropdown (9 presets), font-size dropdown
(S/M/L/XL). Font-size is a standalone custom Mark — not piggy-backing
on the textStyle global attribute, which proved unreliable in TipTap
v3. WYSIWYG: editor's typography (Newsreader, 20 px, dark) matches
the player's body text styling so what you type is what gets shown.

### Photo + audio uploads

Browser → `/api/explorable/upload` (Vercel function) → Firebase
Storage REST API. Server-to-server bypass CORS, no service-account
key needed (relies on the open Storage rules). Vercel free-tier
request-body cap ≈ 4.5 MB, so photos > 2 MB are client-side resized
(longer edge → 2000 px, JPEG q0.85) before posting. GIFs and other
non-JPEG/PNG/WebP formats skip the resize so animation isn't lost.

---

## 6. Implementation notes / decisions

- **Single source of truth for player position** is `useLocationSource()` in `src/lib/explorable/location-source.ts`. Picks dev override when toggled, otherwise live `watchPosition`. Returns `{ position, error, devEnabled, devPosition, setDevEnabled, setDevPosition }`.
- **Discovery radii** are constants in `discovery.ts`: `DISCOVERY_RADIUS_M = 15`, `WARM_RADIUS_M = 30`. Forgiving of GPS drift.
- **Service worker** (`public/sw.js`) only intercepts same-origin GETs to avoid breaking uploads. Cache name is `memorial-church-v2`. If you change the SW, bump the cache version.
- **All progress in-memory.** Refresh = clean slate. Multi-session play would need to restore via sessionStorage or a Firestore room.
- **Modal stacking:** explainer interstitials never render over an active StopCard, journal, lesson, or any sort/reveal modal — they wait for a clean map.
- **Indoor prompt is sticky** once any trigger has been crossed: stays open until the player taps "Yes I'm inside", which permanently disables all triggers + reveals indoor pins for the session.
- **Midway sort fires only when the lesson was AUTO-fired** (`autoExplainerFired` latch), so dev "Lesson preview" doesn't drag the player into a sort.
- **Pin colours:** discovered + indoor = red (pulsing); collected = blue (no pulse, no opacity reduction). Reveal halos: red = author excluded but player included, yellow = author included but player did not.

---

## 7. What's not built (deferred)

- **Two-player rooms** — single-player only right now. Firebase RTDB position sync is set up env-wise but no code uses it.
- **Voice dictation button** — the disagreement textarea relies on the phone keyboard's built-in microphone instead of a dedicated SpeechRecognition button.
- **Multi-session persistence** — refresh deliberately wipes progress. Add sessionStorage or move into Firestore rooms when needed.
- **Auto-detect indoor on player approach** — currently manual via the geofence prompt. Replacing with continuous "are you inside this polygon?" detection would need building polygon authoring.
- **Reveal "you all agreed" closing screen** — handled, but only shows a single card. Could be richer.
- **Tour logging to Google Sheets** — the `/api/log-tour` endpoint exists from Provenance days but isn't called from explorable code.

---

## 8. Repo conventions / gotchas

- **Service worker caching is aggressive.** When changes don't appear on the deployed Vercel: DevTools → Application → Storage → Clear site data + hard refresh. On mobile: Safari Settings → Safari → Advanced → Website Data → delete the entry; Chrome Android: ⋮ menu → Settings → Site settings → All sites → Clear & reset.
- **Vercel env vars require redeploy** to take effect — adding `NEXT_PUBLIC_FIREBASE_*` keys to the project settings doesn't push them until you trigger a fresh build.
- **Storage CORS is no longer needed** because uploads go server-side via `/api/explorable/upload`. Earlier sessions tried to fix CORS on the bucket; that's superseded.
- **Firebase Storage requires the Blaze plan** as of Google's 2024 policy change for new projects. Free tier within Blaze is more than enough for prototyping (5 GB stored, 1 GB/day egress).
- **The first Maps API key in the repo lives in the legacy `Provenance` Google Cloud project**, not in `provenance-explorable`. Firebase services use the new project; Maps uses the old. Don't try to "unify" without updating env vars + referrer restrictions.

---

*End of handoff. The build is playable end-to-end as a single-player
experience. The major surfaces — game flow, admin authoring, sort
mechanic, reveal sequence — are in place; deferred items above are
the natural next moves.*
