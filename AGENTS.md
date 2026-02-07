# Agent Guidance

## Project Overview
- Build a browser-based collection of simple games and puzzles.
- Provide a clear menu to launch games and a consistent way to return to the menu.
- Aim for accessible controls and responsive layouts.

## Development Principles
- Keep the project framework-light (vanilla HTML/CSS/JS unless we decide otherwise).
- Prefer modular game implementations with shared UI utilities.
- Keep UI states explicit (menu vs. game) to simplify navigation.
- Give each game its own subdirectory under the project root.
- Separate HTML, CSS, and JS files where practical.
- Add a short description for each game in this file.
- Do not ask follow-up questions after completing a task unless explicitly requested.

## Code Style
- Favor readable names over abbreviations.
- Use consistent formatting and avoid inline comments unless requested.
- Keep functions focused; split large components into helpers.

## UI Style
- Keep the UI in a Windows XP silver/gray theme.
- Prefer soft gradients, beveled edges, and clear focus states.
- Maintain generous spacing for readability and accessibility.

## UI Notes
- Current inconsistency: Asteroids shows score/lives/level both in the shell status bar and in-canvas HUD; keep behavior as-is for now and standardize this presentation later across games.

## Menu Ordering
- Keep the main menu list in alphabetical order by game title.

## Game Descriptions
- Asteroids: Pilot a drifting ship through wraparound space, shatter asteroid waves, and survive with limited lives.
- Conway's Game of Life: A simulation sandbox with step/run controls, randomize (about 1/3 filled), speed slider, and classic presets (glider, pulsar, lightweight ship).
- Defender: Patrol a wraparound frontier with thrust controls, shoot down landers, and rescue falling civilians.
- Hamurabi: Rule ancient Sumeria for ten years, balancing grain, land, and population through yearly reports and decisions.
- Minesweeper: A classic grid with beginner/intermediate/expert sizes, first-click safety, flagging, timer, and a reset face.
- Retro Racer: Chase an endless pseudo-3D highway run inspired by arcade road racers, weaving through traffic, managing speed, and surviving three crashes.
- Tetris: Classic falling tetrominoes with next preview, line clears, score, and keyboard controls.
- Snake: A grid-based classic with growing length, speed ramping, and keyboard controls.
- Breakout: Paddle-and-brick arcade classic with angle control, lives, and keyboard controls.
- Space Invaders: Defend the base by clearing alien formations with shields, waves, and scoring.
- Simon Says: Repeat the growing color-and-tone sequence using pads or keyboard cues.
- Slalom: Drive a weaving downhill road that narrows and speeds up over time while dodging obstacles.
- Klondike Solitaire: Classic draw-three Klondike with drag, double-click to foundations, and undo support.

## Testing & Validation
- If tests are added later, follow existing patterns.
- Manually verify the menu and return flow after changes.
