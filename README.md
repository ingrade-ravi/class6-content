# Arduino UNO Learning Hub (Neon Dark UI)

A modern, dark-themed learning web app for **Arduino UNO** with a **Quiz** + **Flashcards**, neon red/blue accents, glassmorphism, animated background particles, and a futuristic custom cursor.

## Run locally

### Option A: Python (recommended)

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

### Option B: Any static server

Serve this folder as static files (it’s just `index.html`, `styles.css`, `app.js`).

## Controls

- **Quiz**
  - Keys **1–4**: answer
  - **Enter**: next (after answering)
- **Flashcards**
  - **Space**: flip
  - **← / →**: previous / next

## Files

- `index.html`: layout + views (Home / Quiz / Flashcards)
- `styles.css`: dark neon theme, glass panels, animations, 3D flip, cursor visuals
- `app.js`: routing, quiz/flashcards logic, cursor trail, canvas particles, optional click sounds

