# LiveX AI City · animatic

30-second 16:9 pre-viz for the LiveX brand film. The story and shot list are in [`TREATMENT.md`](TREATMENT.md), and the edit list for the generated shots is in [`EDIT.md`](EDIT.md).

`audio/score.py` reuses the synth voices from `../claude-resume/audio/score.py`, so keep both projects checked out side by side.

```bash
npm install
npx playwright install chromium        # skip if PLAYWRIGHT_BROWSERS_PATH already provides it
pip install -r audio/requirements.txt  # numpy + scipy for the score

npm run preview                        # http://localhost:5173 — click the canvas to play with sound
node render.mjs --cues                 # timeline cues → audio/cues.json
python audio/score.py                  # → out/score.wav
node render.mjs --frames               # → frames/*.png (add --from/--to to render in chunks)
node render.mjs --encode               # → out/livex-ai-city-animatic.mp4 (+ out/score.webm)
```

Pass `--no-audio` to `--encode` for a silent cut. Set `FFMPEG=/path/to/ffmpeg` if ffmpeg isn't on your PATH.
