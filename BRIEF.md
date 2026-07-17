# Cryptocelium — Conference Sprint Brief

**Context for Claude Code:** This repo is Dicelium, a generative mycelium ecosystem simulation (vanilla JS, Canvas 2D, Web Audio, deployed on Vercel at dicelium.xyz). We are building a conference-specific experience for the Blockchain Futurist Conference (July 21–22, 2026). Deadline is hard: everything in CORE must be shippable and tested on a real phone before July 21. Reuse the existing rendering engine wherever possible — do not rewrite it.

**Guiding principles:**
- Deterministic everything: an organism's full appearance derives from its seed. Same seed → identical render on any device. No stored visual state.
- Mobile-first: this will be used one-handed, on mid-range Android phones, on bad conference wifi. Portrait layout, thumb-reachable controls, 60fps target with graceful degradation. Respect `prefers-reduced-motion`.
- Offline-tolerant: rendering must never depend on the network. Only the Supabase insert/read does.
- Restraint: motion as art, not garnish. No decorative effects that fight the organisms.

---

## SCOPE — build in this order. Do not start a later tier until the earlier tier works on a phone.

### TIER 1 — CORE (non-negotiable)

#### 1. Spawn flow (`/join` or equivalent route)
- User arrives (via QR code), sees a minimal screen: one text input ("your name or any phrase") + one button ("spawn").
- Seed derivation: `seed = hash(normalizedInput + serverAssignedNonce)` — include a nonce or timestamp component so two people named "Alex" get different organisms, but store both the raw input and final seed so the organism is always re-derivable.
- On submit: organism blooms on screen from the seed using the existing engine (this is the wow moment — it should start rendering within ~1s).
- After bloom, show:
  - **Claim code**: short, human-friendly, unique (e.g., 2 words + 2 digits, like `moss-ember-42`). Copy-to-clipboard button. Framed thematically: "Save this — it's the key to your organism."
  - **Optional email field**: "Leave your email to be notified when minting opens for genesis organisms." Optional, one field, no account creation.
- Entire flow must be completable one-handed in under 20 seconds.

#### 2. Supabase persistence
One world, one table. Suggested schema:

```sql
create table spawns (
  id uuid primary key default gen_random_uuid(),
  seed text not null,
  raw_input text not null,
  claim_code text unique not null,
  email text,                -- nullable, optional
  x float not null,          -- world position
  y float not null,
  created_at timestamptz default now()
);

create table world_meta (
  id int primary key default 1,
  sealed boolean default false,
  sealed_at timestamptz
);
```

- Placement: assign x/y server-side or client-side deterministically with a proximity rule — new spawns appear near existing activity but never overlapping (simple rejection sampling against recent spawn positions is fine).
- Use the anon key with RLS: inserts allowed only while `world_meta.sealed = false`; reads always allowed; no updates/deletes from clients.
- **Seal switch:** when `sealed = true`, the join flow displays "Genesis world — sealed July 22, 2026" and disables spawning. Build this now; it's one boolean.

#### 3. World view (`/world`)
- Full-screen canvas rendering ALL spawns from the table, each regenerated client-side from its seed at its stored x/y.
- Native touch pan/zoom (pinch + drag). Elastic world sizing: `worldRadius = baseRadius * sqrt(spawnCount)`.
- Refresh strategy: poll every ~30s OR a manual refresh control. Do NOT add Supabase Realtime for this sprint.
- Spawn counter visible ("142 organisms and growing").
- **Claim lookup ("sign in to your creature"):** an input for a claim code → camera pans/zooms to that organism and highlights it briefly.
- Performance budget: must hold interactive framerates with 300+ organisms on a mid-range phone. Use viewport culling (only fully simulate/render organisms near the visible area; distant ones as cheap static impressions). Profile before adding anything else.

#### 4. Mobile UI pass
- Portrait-first. All interactive elements ≥44px touch targets, bottom-third of screen where possible.
- Test at 380px width. No horizontal scroll anywhere.
- QR-friendly: the join URL should be short and clean.

### TIER 2 — STRETCH (only after Tier 1 works on a real phone)

#### 5. Landing page (two doors)
- **Door 1 — "Join the Futurist World"** (featured): dated "Genesis — Blockchain Futurist Conference, July 21–22", live spawn count on the button. → `/join`
- **Door 2 — "Grow a Passing World"**: the ephemeral sandbox. Copy sells the contrast, biology-flavored: "A passing world blooms while you watch and returns to soil when you leave. The Futurist world remembers."
- Minimalist: full-screen canvas hero, one short paragraph, two doors. No sectioned content.

#### 6. Ephemeral sandbox (`/sandbox`)
- Reuses the spawn flow UI but 100% client-side, in-memory. User can spawn several organisms from typed phrases and watch them grow together.
- NO save, NO export, NO account prompt, NO persistence of any kind. Refresh = gone. This is intentional; do not soften it.
- A single quiet link back: "Ready for one that lives? → Join the Futurist World."

#### 7. Worms (system-generated fauna)
- Users can NEVER create worms. Worms are derived entirely from world state: one worm appears per N spawns (start with N=15; make it a constant).
- Fully deterministic and computed client-side: seed worm generation from a hash of the world's spawn set (e.g., sorted seed list), so every viewer sees identical worms in identical places. Zero database impact.
- Worms drift/thread between colonies in denser regions. Cheap to render — they must not blow the performance budget.
- Discoverable threshold: small caption like "the world grows a worm every 15 organisms."

### TIER 3 — REWARD (only if Tiers 1–2 are done and tested)

#### 8. Climate: clear + rain only
- Climate is a **deterministic function of time**: `climate = f(worldSeedConstant, timeEpoch)` where `timeEpoch = floor(now / EPOCH_MS)` with EPOCH_MS ≈ 3 hours. Every device computes the same weather for the same moment. No database, no server, no sync.
- Exactly two states for this sprint: **clear** and **rain**. Rain = subtle palette shift (cooler, desaturated) + light particle layer. Particle count capped and adaptive to framerate; disabled under `prefers-reduced-motion`.
- Transitions fade over ~10s. The effect must be quiet enough that the organisms stay the focus.
- Architecture note: build `f()` to return a climate enum so more states slot in later without refactor — but implement ONLY clear and rain now.

---

## ALSO CREATE: `PHASE2.md` in repo root

Write this file so post-conference ideas are captured and out of the build path:

```markdown
# Cryptocelium — Phase 2 (post-conference)

## Chain layer (lazy mint)
- Genesis spawns become mintable; mint writes seed + lineage to contract. Same organism re-renders from chain data (deterministic).
- Chain choice OPEN: fxhash/Tezos (art crowd) vs Base via Zora/Highlight (builder crowd). Decide using conference intel, not fees — all candidates are near-free in 2026.
- Embedded wallets (Privy/thirdweb), gasless mints. Contract: small custom ERC-721 with merge(tokenA, tokenB) → burn one, mint child with hash(seedA, seedB), emit lineage event.
- Email list from genesis spawns = demand signal and launch channel.

## Anastomosis merge (the one animation that matters)
- Consensual merge of two owned spawns → masterpiece with fossil strata; absorbed spawn recedes as a sediment layer. "In Cryptocelium nothing dies."
- Single ownership required pre-merge (creates acquisition pressure once tradeable).
- World stays append-only until ownership exists. No burning before the chain layer.

## Full climate system
- Extend deterministic f(worldSeed, timeEpoch) to: volcanic, inundation/aquatic, cold, heat.
- Climate eras are reconstructable from timestamps → organism histories ("born during the first rains, survived the volcanic era") → ties into fossil-strata lore. Weather eras + strata = world geology.
- Each state is a renderer effect with its own mobile performance budget; budget one evening per climate minimum.

## Other parked ideas
- Supabase Realtime live projection (event screens)
- Generative Web Audio ambient layer (muted by default, tap to enable)
- Two-door landing evolution: sealed genesis worlds as browsable archive
```

---

## Definition of done (per tier)
- Works on a real mid-range Android phone over cellular, one-handed.
- Spawn flow: QR → organism on screen → claim code saved, under 20 seconds.
- World view holds framerate with 300 organisms.
- Sealing tested: flipping the boolean cleanly closes the world.
- No console errors, no layout breaks at 380px.

## Explicitly out of scope this sprint
Wallets, minting, any chain code, merges, Realtime, audio, climates beyond clear/rain, per-user worlds, accounts/auth of any kind.
