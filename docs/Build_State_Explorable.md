# Build State — Provenance Explorable

*Handoff document for Claude Code sessions on the explorable project.
Last updated 2026-05-27.
Read this instead of re-discovering the codebase.*

---

## 0. Project Context

This is a **separate project** forked from the Provenance place-based
learning app. It shares the same core technology stack but is a
fundamentally different learning experience — a two-player cooperative
game that teaches **contextualisation** (a core historical thinking
skill) through a puzzle-piece evidence-sorting mechanic.

**Repo:** `github.com/SeanHu73/provenance-explorable` (independent
from the main Provenance repo — no shared git history)

**Relationship to Provenance:** This project reuses the Next.js +
Tailwind + TypeScript + Firebase scaffolding but replaces the Google
Maps–based tour with an 8-bit isometric pixel art game map, a
two-player room system, and an evidence-puzzle mechanic. The AI
response pipeline, photo matcher, storyteller flow, guide avatar
system, and Google Maps integration from the original are **not used**
and should be removed or ignored.

---

## 1. Architecture

Next.js + TypeScript + Tailwind CSS + Framer Motion.
Firebase Firestore (data) + Firebase Realtime Database (low-latency
position sync). Deployed on Vercel.

### What to keep from the original codebase

- Next.js App Router scaffolding, `layout.tsx`, Tailwind config
- Firebase client initialisation (`src/lib/firebase.ts`) — re-pointed
  to the new Firebase project via `.env.local`
- Framer Motion (transitions between game phases)
- Voice input via Deepgram (`/api/transcribe`, `MicButton`) — used
  for dictating explanations
- Tour logging to Google Sheets (`/api/log-tour`, `tour-logger.ts`)
  — adapt for explorable events
- Room system foundation (`src/lib/room-store.ts`,
  `src/context/RoomContext.tsx`, room components) — adapt for
  two-player host/partner model
- PWA manifest and service worker config
- Theme system (`globals.css` tokens, `ThemeContext`) — restyle for
  pixel art aesthetic

### What to remove or ignore

- Google Maps integration (`@vis.gl/react-google-maps`, `Map.tsx`,
  all map-related components)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var
- AI response pipeline (`/api/ask`, `tour-question-router.ts`,
  `ANTHROPIC_API_KEY`)
- Photo matcher (`photo-matcher.ts`)
- Photo library admin (`/admin/photos`)
- Storyteller flow, guide avatars, `MeetGuideCard`, `GuideOutroCard`
- All v1 pin-based inquiry components (`InquirySheet`, `AskSheet`)
- Knowledge database references
- Session memory / coverage tracking
- Question routing system

### New dependencies needed

- Firebase Realtime Database SDK (for character position sync)
- Canvas/sprite rendering library or custom `<canvas>` (for the
  pixel art map and character movement)

---

## 2. The Learning Experience — Complete Flow

### Overview

Two players. Two devices. One room code. They walk through a physical
site (Stanford campus — Oval → Memorial Court → Quad → Memorial
Church) while navigating an 8-bit pixel art game map on their phones.
One player is the **Host** (controls the character), the other is the
**Partner** (sees the character move but also sees hidden evidence
pins). The game teaches contextualisation through a puzzle metaphor.

### Phase-by-phase flow

```
Room Setup (host creates, partner joins with code) →
  Character Selection (both pick a pixel avatar) →
  Essential Question (displayed prominently — the question they
    must answer by the end) →
  Exploration Phase 1 (walk the map, discover stops) →
    Stop sequence: Notice prompt → Context card (no questions) →
    Evidence collected (puzzle piece added to inventory) →
  Midway Lesson ("What is contextualisation?") →
    Puzzle metaphor tutorial →
    First evidence sort (puzzle box vs trash can) →
    Write/dictate explanation for each included piece →
  Exploration Phase 2 (remaining stops) →
  Final Evidence Sort →
    All remaining pieces laid out →
    Sort into puzzle box or trash can →
    Review everything (including midway selections) →
    Submit →
  Reveal Sequence →
    Green halos: agreements (my evidence = your evidence) →
    Red halos: disagreements (you included, I didn't) →
      Flip puzzle piece to read my explanation →
      Agree or disagree + explain reasoning →
    Yellow halos: things I included that you didn't →
      Flip puzzle piece to read my explanation →
      Agree or disagree + explain reasoning →
  Closing Message →
    "We can agree or disagree. History is rarely settled truth.
     It's claims that we must support with evidence. We reconstruct
     the past, like a puzzle, with our pieces of evidence."
```

---

## 3. Two-Player Room Architecture

### Roles

| | Host | Partner |
|---|---|---|
| **Character movement** | Controls the pixel character on the map with d-pad / tap-to-move | Sees the character move in real-time (read-only) |
| **Evidence pins** | Does NOT see pins on the map | Sees pins — they appear when the character is within the detection radius |
| **Pin discovery** | Sees a coloured clue circle around the character when near a pin | Sees the pin itself + the same clue circle |
| **Stop trigger** | Either player can tap to enter a discovered stop | Either player can tap to enter a discovered stop |
| **Stop content** | Both see the same notice + context sequence | Both see the same notice + context sequence |
| **Evidence sorting** | Both sort independently on their own device | Both sort independently on their own device |
| **Reveal** | Sees the comparison against the author's choices | Sees the comparison against the author's choices |

### Position sync

Use **Firebase Realtime Database** (not Firestore) for character
position. The host writes `{ x, y, mapId, timestamp }` to
`rooms/{code}/position` on every tile move. The partner subscribes
with `onValue` and renders the character at the synced position.
Latency target: <100ms.

### Room document (Firestore)

```typescript
interface ExplorableRoom {
  code: string;                    // 4-char alphanumeric
  hostSessionId: string;
  partnerSessionId: string | null;
  hostName: string;
  partnerName: string | null;
  hostCharacter: string;           // sprite ID
  partnerCharacter: string | null;
  started: boolean;
  currentMapId: 'exterior' | 'interior';
  discoveredStopIds: string[];
  completedStopIds: string[];
  phase: ExplorablePhase;
  
  // Midway sort results (per player)
  midwaySorts: {
    host: EvidenceSort | null;
    partner: EvidenceSort | null;
  };
  
  // Final sort results (per player)
  finalSorts: {
    host: EvidenceSort | null;
    partner: EvidenceSort | null;
  };
  
  createdAt: Timestamp;
}

interface EvidenceSort {
  included: string[];              // stop IDs put in puzzle box
  excluded: string[];              // stop IDs put in trash can
  explanations: Record<string, string>;  // stopId → explanation text
}
```

### Detection radius

Each pin has a detection radius defined in tile coordinates (e.g.,
3 tiles). When the host's character enters this radius:

- **Both devices** see a coloured circle glow around the character
  (the "clue" — signals proximity to something)
- **Partner only** sees the pin itself become visible

The pin is only tappable (by either player) when the character is
within a smaller "activation radius" (e.g., 1 tile adjacent).

---

## 4. Map System (Google Maps + GPS)

**Direction change (2026-05-27):** the explorable now uses real Google
Maps tiles + live device GPS instead of a custom pixel-art tilemap.
Players physically walk the Stanford campus; pins are hidden until
they enter a stop's detection radius. The original isometric pixel
plan is dropped (it required significant custom art for Stanford-
specific buildings, and the GPS approach is more faithful to the
"place-based" mission).

### One map, bounded to campus

A single Google Maps `<Map>` component using `mapTypeId="hybrid"`
(satellite + labels). The map is **strictly bounded** to the Stanford
campus core via `restriction: { latLngBounds, strictBounds: true }`,
and zoom is capped at `minZoom: 16`, `maxZoom: 20` so the experience
stays scoped to the tour area.

Source of truth: `src/lib/explorable/geo.ts` — bounds, center, and
the haversine `distanceM` helper.

### Player position

Real GPS via `navigator.geolocation.watchPosition`, with
`enableHighAccuracy: true`. Practical accuracy on a modern phone:

| Conditions | Typical accuracy |
|---|---|
| Open sky (e.g. the Oval) | 3–5 m |
| Under trees / near buildings | 5–10 m |
| Inside a building | 10–30 m or unreliable |

Pin detection radii should be ≥ 10 m for outdoor stops; smaller is
unreliable. **Indoor stops (e.g. inside the church) cannot rely on
GPS** — they need a different trigger (QR code, tap-to-enter, or
proximity beacons). Defer indoor stops to a later phase.

`src/lib/explorable/location-source.ts` exposes `useLocationSource()`
which returns `{ position, devEnabled, devPosition, setDevEnabled,
setDevPosition, error }`. It's the single source of truth — all
proximity / detection logic should consume this hook.

### Dev location override (desk testing)

The `useLocationSource()` hook supports a "fake GPS" mode for
authoring without walking to campus. When enabled, it ignores the
real device GPS and uses a saved lat/lng instead. State persists in
`localStorage` (key: `provenance-explorable-devloc`).

UI: `src/components/explorable/DevLocationOverlay.tsx`. Visible
automatically in `npm run dev` or when the URL contains `?devloc=1`.

Workflow:
1. Open `/explorable?devloc=1`
2. Tick "Fake GPS" in the top-right panel
3. Tap any point on the map → that becomes the player's "position"
4. Player marker turns orange (real GPS is blue)

### Indoor experience (Memorial Church interior)

Out of scope for v1. Two viable approaches when it's added:

- **QR code at the entrance** — scanning it manually switches the
  game to the interior phase.
- **A "You are inside" prompt** when GPS shows the player within ~5 m
  of the church entrance for ≥ 15 seconds.

The interior itself does not need a custom map renderer — a
floorplan diagram (SVG) with tappable hotspot pins is enough.

---

## 5. Stop System

### Stop data model

```typescript
interface ExplorableStop {
  id: string;
  title: string;
  mapId: 'exterior' | 'interior';
  tileX: number;                   // pin position in tile coords
  tileY: number;
  detectionRadius: number;         // tiles — clue circle appears
  activationRadius: number;        // tiles — pin becomes tappable
  
  // Content (displayed in sequence, no questions)
  notice: {
    prompt: string;                // "Look at..."
    photos: StopPhoto[];           // observation photos
    timer?: number;                // optional look timer
  };
  context: {
    text: string;                  // historical context
    photos: StopPhoto[];
  };
  
  // Puzzle piece appearance
  puzzlePiece: {
    photoUrl: string;              // cropped observation photo
    label: string;                 // stop title displayed on piece
  };
  
  // Author's evidence assessment
  authorAssessment: {
    included: boolean;             // does the author consider this
                                   // relevant evidence?
    explanation: string;           // author's reasoning (shown at
                                   // reveal by flipping the piece)
  };
}
```

### Stop sequence (when a pin is activated)

1. **Notice card** — observation prompt + photos. "Look at [detail]."
   No question asked. Optional timer.
2. **Context card** — historical context. Text + optional photos.
   No question asked.
3. **Collected!** — brief animation of a puzzle piece being added to
   the inventory. The piece shows the stop's observation photo,
   cropped into a jigsaw puzzle shape, with the stop title as a label.
4. Return to map. Pin disappears (completed). Progress updates.

Key difference from Provenance: **no wonder/discuss/reveal/reflect
cycle**. Stops are purely notice + context. The interpretive work
happens later in the puzzle sorting phase.

---

## 6. The Puzzle / Evidence Sorting Mechanic

### Visual design

The puzzle interface is a cartoon/pixel art scene with three elements:

1. **Evidence pieces** — each is a jigsaw puzzle piece (random shape,
   they don't need to actually interlock). The front shows the
   observation photo from that stop, cropped to the puzzle shape, with
   the stop title as a label beneath. The back (revealed only at the
   end) shows the author's explanation.

2. **Puzzle box** — a literal illustrated puzzle box where accepted
   evidence goes. Pieces dragged here are "included" in the argument.

3. **Trash can** — a cartoon trash can where rejected evidence goes.
   Pieces dragged here are "excluded" from the argument.

### Interaction

- Pieces are **draggable** (touch drag on mobile)
- Drag a piece to the puzzle box = include as evidence
- Drag a piece to the trash can = exclude as not relevant
- Each piece sorted into the puzzle box triggers a text input
  (with mic button): "Why does this belong in your evidence?"
- Pieces in the trash can do not require an explanation
- All sorting is reversible until the player taps Submit

### When sorting happens

**Midway sort (after the contextualisation lesson):**
- Only the stops completed so far are shown as pieces
- Player sorts and explains
- Results stored per-player in the room document

**Final sort (after all stops are completed):**
- The *remaining* stops (those completed after midway) are shown
- Player sorts and explains
- Then the puzzle box "opens" showing ALL evidence (midway +
  final selections combined)
- Player can review and adjust, then submit

### Tap to flip (reveal phase only)

During the reveal sequence at the end, each puzzle piece becomes
**flippable**. Tapping a piece flips it over to show the author's
explanation on the back. This is the only time the back is visible.
During sorting (midway and final), pieces show only the front
(photo + label).

---

## 7. The Contextualisation Lesson (Midway)

This is the pedagogical core of the explorable — a brief interactive
lesson that teaches contextualisation through the puzzle analogy.

### Content sequence

1. **"What is contextualisation?"** — title screen

2. **Puzzle analogy, part 1:** "Imagine you're building a puzzle. You
   can't put pieces from a different puzzle together — they won't fit."
   *Visual: two puzzle pieces from different boxes trying to connect
   and failing.*

3. **Puzzle analogy, part 2:** "You also can't force wrong pieces next
   to each other — even if they're from the same box."
   *Visual: two same-box pieces in the wrong positions.*

4. **The connection:** "History works the same way. Each piece of
   evidence belongs to a specific time and place. Contextualisation
   means making sure we understand each piece in its original context
   before we use it to build our picture of the past."

5. **The task:** "Here are the stops you've visited so far. Each one
   is a piece of evidence."
   *Visual: the collected puzzle pieces appear, each showing the
   stop's observation photo and title.*

6. **Essential question restated:** The question from the opening
   appears prominently.

7. **Sort instruction:** "Drag the pieces you think help answer this
   question into the puzzle box. Put the ones that don't belong in
   the trash. For each piece you keep, explain why it matters."

8. **The sorting interface opens** (see §6).

---

## 8. The Reveal Sequence

After the player submits their final evidence sort, the reveal
unfolds in a deliberate sequence:

### Step 1 — Agreements (green halo)

All pieces where the player and the author agree (both included OR
both excluded) appear with a **green halo**. For included pieces,
the player can tap to flip and read the author's supporting
explanation. This validates their thinking.

### Step 2 — Player included, author didn't (red halo)

One at a time, pieces the player included but the author did not
appear with a **red halo**. For each:

- The piece is shown front-side (the player's choice)
- Player taps to flip → sees the author's explanation for why this
  was NOT included
- Player responds: **Agree** or **Disagree**
- If they respond, they write/dictate their reasoning

### Step 3 — Author included, player didn't (yellow halo)

One at a time, pieces the author included but the player did not
appear with a **yellow halo**. For each:

- The piece is shown front-side
- Player taps to flip → sees the author's explanation for why this
  WAS included
- Player responds: **Agree** or **Disagree**
- If they respond, they write/dictate their reasoning

### Step 4 — Closing message

A final screen with the message:

> "We can agree or disagree. History is rarely settled truth. It's
> claims that we must support with evidence. We reconstruct the past,
> like a puzzle, with our pieces of evidence."

---

## 9. Essential Question

The essential question is displayed prominently at the very start
of the game (after character selection, before exploration begins)
and restated at the midway sort and final sort.

It is the question the evidence is meant to address. It is authored
in the admin interface and stored on the tour/game document.

The question is **not** answered directly by the players. Instead,
their evidence selections and explanations constitute their implicit
answer. The reveal sequence then surfaces where their reasoning
diverges from the author's.

---

## 9b. Access points (current build)

| URL | Purpose |
|---|---|
| `/explorable` | The game route. Bounded Stanford Google Map + live player marker. Dev override panel auto-shows in dev. |
| `/explorable?devloc=1` | Same, but the dev location override panel is forced visible (useful in deployed previews). |
| `/admin/explorable` | Explorable authoring entry point. Stub today — stop authoring lands later. |
| `/admin` | Legacy Provenance admin (kept alive while we strip old code in a separate pass). Has a nav link to `/admin/explorable`. |

None are linked from the main app home — bookmark them.

### Visual style decision (superseded)

An earlier pass explored an 8-bit / pixel-art map (Kenney tilesets,
character sprites, viewport + camera, on-screen d-pad). That branch
was dropped in favour of the GPS + Google Maps approach so the game
matches real geography and benefits from satellite imagery without
custom Stanford-specific art. The pixel-art files
(`src/lib/explorable/tileset.ts`, `stanford-exterior.ts`, `PixelMap.tsx`,
`CharacterSprite.tsx`) were removed from main.

## 10. Admin Interface

### What to keep from original admin

- Tour editor structure (adapt for explorable stops)
- Photo upload and `StopPhoto` display modes
- Rich text toolbar (`RichTextarea`, `FormattedText`)
- Audio upload (`AudioUpload`, `AudioButton`)

### New admin fields

**Game-level:**
- Essential question (rich text)
- Contextualisation lesson text (the puzzle analogy — could be
  hardcoded for v1)
- Closing message text
- Maps: exterior tilemap reference, interior tilemap reference

**Per stop:**
- Title
- Map assignment (`exterior` | `interior`)
- Tile coordinates (x, y) for pin placement
- Detection radius (tiles)
- Notice prompt + photos
- Context text + photos
- Puzzle piece photo (defaults to first notice photo, cropped)
- Puzzle piece label (defaults to stop title)
- **Author's assessment:** toggle (include / exclude) + explanation
  text (rich text with mic)

---

## 11. Firestore Collections

| Collection | Purpose |
|---|---|
| `explorable-games` | Game documents with stops array + essential question + author assessments |
| `explorable-rooms` | Room state: players, phase, sorts, progress |
| `explorable-sessions` | Per-player session persistence |
| `explorable-photos` | Photo library (if needed) |

Firebase Realtime Database path: `rooms/{code}/position` for
character position sync.

### Security rules

Same pattern as original: `allow read, write: if true;` in test
mode. Each collection needs its own explicit rule block.

---

## 12. Environment

### .env.local / Vercel env vars

```
NEXT_PUBLIC_FIREBASE_API_KEY=...        # NEW Firebase project
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=provenance-explorable
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...   # NEW — Realtime Database
DEEPGRAM_API_KEY=...                    # Same as main project
SHEETS_WEBHOOK_URL=...                  # New or same sheet
```

No `GOOGLE_MAPS_API_KEY`. No `ANTHROPIC_API_KEY` (unless AI features
are added later).

---

## 13. Visual Design Direction

**Map surface:** real Google Maps `mapTypeId="hybrid"` (satellite +
labels) restricted to campus. No custom map art — the satellite
imagery and Google's labels do the work.

**UI chrome:** clean, modern, mobile-first. The map is full-screen;
chrome is overlays (top: dev panel + status; bottom: collected
inventory + actions). Newsreader serif for reading copy (context
cards, explanations); system sans for UI labels.

**Player marker:** pulsing blue dot for real GPS, pulsing orange dot
when the dev override is active. Standard "here you are" affordance.

**Pin states (planned):**
- **Hidden:** not rendered until the player enters the detection
  radius.
- **Detected:** appears with a glow halo — signal that a stop is
  nearby.
- **Tappable:** within activation radius — pin becomes interactive.
- **Completed:** translucent / smaller / desaturated.

**Puzzle / reveal colours (unchanged from earlier plan):**
- Green halo (agreement): `#4CAF50`
- Red halo (player included, author didn't): `#E53935`
- Yellow halo (author included, player didn't): `#FFC107`
- Puzzle box: warm brown/kraft
- Trash can: grey

**Typography:** Newsreader (body serif from Provenance) for longer
reading text (context cards, explanations, the closing message).
System sans for UI controls and labels.

---

## 14. Build Priority

### Phase 1 — Playable core
1. Strip unused Provenance code (Maps, AI pipeline, storyteller flow)
2. Two-player room system (host/join, character select)
3. Pixel art exterior map with tile-based character movement
4. Pin placement + detection radius + clue circle
5. Stop sequence (notice → context → piece collected)
6. Progress tracking (which stops discovered/completed)

### Phase 2 — Puzzle mechanic
7. Midway contextualisation lesson screens
8. Puzzle piece UI (draggable pieces, puzzle box, trash can)
9. Evidence sorting with explanation input
10. Midway + final sort flow

### Phase 3 — Reveal + polish
11. Reveal sequence (green/red/yellow halos, flip to read)
12. Agree/disagree response capture
13. Closing message
14. Interior map + map transition
15. Admin interface for authoring stops + assessments

### Phase 4 — Nice to have
16. Character walk animations (4-direction, 2–3 frames)
17. Sound effects (pixel game style)
18. Puzzle piece collection animation
19. Session logging to Google Sheets

---

## 15. Key Differences from Provenance

| | Provenance | Provenance Explorable |
|---|---|---|
| **Map** | Google Maps (real GPS) | Pixel art tilemap (virtual) |
| **Players** | 1 shared phone per group (2–4 people) | 2 players, 2 devices |
| **Roles** | Everyone sees the same screen | Host moves character; Partner sees hidden pins |
| **Stop content** | Seed → Notice → Wonder → Reveal → Reflect | Notice → Context only (no questions at stops) |
| **Interpretive work** | Discussion questions at each stop | Evidence sorting at midway + end |
| **AI** | Claude Haiku for off-path questions | None (all content authored) |
| **Pedagogy target** | Contextualisation through inquiry | Contextualisation through evidence evaluation |
| **Visual style** | Field journal / frosted glass cards | 8-bit isometric pixel art game |
| **Assessment** | Slider reflections + written responses | Puzzle sort + agree/disagree with author |

---

*End of handoff. This document describes the target design. The
codebase currently contains the full Provenance app — Phase 1 begins
by stripping it down to the shared scaffolding and building the new
systems on top.*
