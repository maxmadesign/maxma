# Motion résumé — 30 s, one dot, all code

A 30-second motion-graphics résumé (1920×1080 · 60 fps · 120 BPM, loops seamlessly).
No timeline editor or keyframes. Every frame is a pure function `render(t)` drawn on a Canvas 2D,
and the soundtrack is synthesized from sine waves and noise, cued from the same timeline.

**Output:** `out/claude-motion-resume.mp4` (H.264 High / AAC, BT.709) · `out/poster.png`

## The idea
One continuous take. A single clay-coloured dot is the protagonist. It writes “Hi, I’m Claude” and
becomes the full stop, rides a cubic-bezier, races `linear` against `spring`, bounces through four of the
twelve principles (anticipation, stretch, arc, squash), becomes the tittle of the *i*, walks through button
states, turns into the dark-mode toggle knob, marks the card you should open, punctuates the montage,
and ends as the full stop of the signature. The last frame is the first frame.

Every claim is demonstrated on screen, with a designer’s working notes: spacing charts, live bezier
values, a 12-column grid, a 1.25 type scale, real WCAG contrast ratios computed in code (brand Clay
fails at 2.8:1 on paper, so text uses Clay 700 at 4.8:1), a responsive breakpoint, a UI state machine,
a `clip-path: circle()` view transition and a shared-element transition.

| Time | Chapter | Beat |
|---|---|---|
| 0–4 s | 00 Hello | the dot writes the headline; "every frame of this résumé is code" |
| 4–10 s | 01 Motion | easing curve → same distance, different feeling → animation principles |
| 10–16.5 s | 02 Graphics | impact → grid → type scale → contrast check → bento → reflow to mobile |
| 16.5–24 s | 03 Interaction | button states → theme toggle and dark reveal → "motion that explains" |
| 24–30 s | 04 Signature | four-beat montage → collapse into the dot → "Claude." → loop |

## Build
```bash
npm install                      # fonts (OFL) + playwright, matching the preinstalled Chromium
npm run preview                  # http://127.0.0.1:5173 — scrub with ←/→, play with space
                                 # (with prefers-reduced-motion, Play shows held key frames; “Full motion” opts in)
node render.mjs --cues           # export sound cues → audio/cues.json
python audio/score.py            # numpy + scipy → out/score.wav
node render.mjs --frames --blur 8 && FFMPEG=/path/to/ffmpeg node render.mjs --encode
```
`--blur 8` averages 8 sub-frames over a 180° shutter for true motion blur (about 3 min on 4 cores).

## Files
- `src/engine.js` — easing, analytic springs, bezier solver, colour/contrast maths, kerning-aware type helpers
- `src/scenes.js` — the timeline: hero choreography, 12 scenes, light/dark worlds, HUD, sound cues
- `src/main.js` — boot, preview player, motion-blur accumulator
- `render.mjs` — headless parallel renderer and encoder
- `audio/score.py` — the soundtrack (pads, groove, sidechain, sound design, reverb, master)
