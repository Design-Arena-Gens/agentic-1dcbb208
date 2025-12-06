# Agentic Sora-2 Lab

Next.js application that interprets natural language prompts into cinematic video sketches. The synthesis stack extracts a “scene recipe” (palette, camera grammar, narrative beats) server-side and renders an animated clip entirely in the browser using Web APIs — no heavyweight model runtime needed, deployable straight to Vercel.

https://agentic-1dcbb208.vercel.app

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd <project-name>
   ```

2. Install dependencies:
   ```bash
   cd agentic-app
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
├── agentic-app/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Client UI & WebGL-inspired canvas renderer
│   │   │   └── api/generate/      # Prompt → scene recipe API
│   │   └── lib/scene/             # Prompt analysis + deterministic recipe generator
│   └── public/                    # Static assets
├── README.md
└── ...
```

## 🛠️ Available Scripts

- `npm run dev` – Start the local development server
- `npm run build` – Create an optimized production build
- `npm run start` – Serve the production build locally
- `npm run lint` – Run ESLint

## 🎨 Key Features

- Sora-2 inspired scene understanding distilled into a compact API (`/api/generate`)
- Deterministic cinematic “scene recipe” generator based on theme, mood, camera DNA
- Browser-side MediaRecorder pipeline that renders high-frequency canvas frames into downloadable WebM clips
- Tailwind-powered UI with real-time telemetry, palette breakdown, and narrative beats

## 🧠 How it works

1. **Prompt analysis** – The API maps keywords/themes to palettes, camera setups, and motion motifs (`src/lib/scene/generator.ts`).
2. **Scene recipe** – The server responds with a structured recipe describing elements, motion style, audio hints, and narrative beats.
3. **Procedural render** – The client canvas synthesizes each frame with layered gradients, camera transforms, and glow effects derived from the recipe.
4. **Video emission** – Frames are captured via `MediaRecorder`, written to WebM, and exposed for playback/download instantly in the browser.

## 🔧 Customization

To experiment further:

1. Extend `THEMES` in `src/lib/scene/generator.ts` with new palettes & descriptors.
2. Add novel motion styles in `page.tsx` to change particle choreography.
3. Swap the canvas renderer for WebGL / Three.js to unlock volumetric effects.
4. Hook the API into a true diffusion/video synthesis backend when available.

## 📚 Technologies Used

- Next.js 14 (App Router)
- TypeScript + Tailwind CSS
- Zod (API validation)
- MediaRecorder + Canvas 2D APIs

## 🤝 Contributing

Contributions welcome—open a PR with refinements to the renderer, UI, or scene generation heuristics.

## 📄 License

MIT
