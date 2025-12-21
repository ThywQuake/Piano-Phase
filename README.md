# Piano Phase Visualizer

> An interactive, web-based visualization of Steve Reich's minimalist masterpiece, _Piano Phase_ (1967).

> This project is developed by PKU students group in 2025 Fall Semester as part of the course "Music and Mathematics".
>
> `Group ID`: `T5-3`

👉 **[Live Demo](https://thywquake.github.io/Piano-Phase)**

## 📖 Project Overview

This project is an interactive music visualization application based on the Web Audio API and React. It is designed to simulate and deeply analyze Steve Reich's minimalist composition, _Piano Phase_. By utilizing a precise phase control algorithm, the application replicates the process where two pianists playing the same melody gradually drift out of sync due to minute tempo differences ("Phasing"). It provides multi-dimensional visual feedback, ranging from traditional linear music notation to topological geometric spaces.

## 🛠 Tech Stack

The project is built using modern front-end engineering standards with the following core dependencies:

- **Core Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Audio Engine**: Native Web Audio API (No third-party audio libraries, ensuring high-precision scheduling)
- **3D Rendering**: [Three.js](https://threejs.org/) (via [@react-three/fiber](https://www.google.com/search?q=https://docs.pmnd.rs/react-three-fiber/) & [@react-three/drei](https://github.com/pmndrs/drei))
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **Math Typesetting**: [MathJax](https://www.mathjax.org/)

## 🏗 Architecture

The project follows a variant of the **MVC (Model-View-Controller)** pattern to ensure seamless synchronization between high-precision audio and fluid visual rendering.

### 1. Audio Core (`Model`)

- **SoundEngine**: A singleton service class acting as the single "Source of Truth".
- **Scheduling Mechanism**: Uses the Web Audio API's standard **Look-ahead Scheduling** algorithm. The scheduler runs every 25ms to pre-schedule notes for the next 0.1s, ensuring millisecond-level rhythmic stability even under high main-thread load.
- **Phasing Logic**: Dynamically calculates the playback rates of both voices to simulate continuous phase drifting.

### 2. Control Layer (`Controller`)

- **App.tsx**: Connects the audio engine with UI components. It uses `requestAnimationFrame` to establish a render loop, polling the audio engine's current state (Progress) every frame to drive component updates for audio-visual synchronization.
- **Chaos Engine**: Calculates the "Auditory Density" of the current acoustic result in real-time. It quantifies rhythmic irregularity by calculating the Coefficient of Variation (CV) of Inter-Onset Intervals (IOI) within a sliding window.

### 3. Visualization Layer (`View`)

- **Linear Staff**: SVG-based rendering showing the relative positions of both voices and the resulting acoustic fusion.
- **Geometric Visualizer**:
- **Melody Clock**: Maps the 12-note sequence onto a circle to intuitively demonstrate the cyclic structure.
- **Phase State Space**: Maps the phase states of the two voices onto a 2D torus unrolled map and an **interactive 3D Torus**.
- **Topological Trajectory**: Tracks the movement of phases within the state space, visualizing the formation of Torus Knots.

## ✨ Key Features

- **Real-time Phasing Simulation**: Freely control phasing speed, BPM, and the number of cycles.
- **Multi-dimensional Visualization**:
- Traditional linear staff (supports dynamic beaming groups).
- Geometric clock and 2D phase graph.
- **3D Interactive Phase Space**: A draggable, zoomable 3D Torus with **fluorescent highlighting** feedback for integer phases (Unison/Canon).

- **Auditory Density Quantifier**: A unique meter displaying the real-time "entropy" of the rhythm.
- **Multi-timbre Support**: Built-in synthesizers for Electric Piano, Marimba, Violin (Pizz), and Clarinet.

## 💻 Development

Ensure you have a Node.js environment installed.

1. **Install Dependencies**:

```bash
npm install

```

2. **Run Development Server**:

```bash
npm run dev

```

The application typically runs at `http://localhost:3000`. 3. **Build for Production**:

```bash
npm run build

```

4. **Deploy (GitHub Pages)**:

```bash
npm run deploy

```

## 📬 Contact

- **Developer**: ThywQuake
- **Email**: thywquake@foxmail.com
- **GitHub**: [ThywQuake/Piano-Phase](https://github.com/ThywQuake/Piano-Phase)
