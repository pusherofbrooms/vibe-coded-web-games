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

## Code Style
- Favor readable names over abbreviations.
- Use consistent formatting and avoid inline comments unless requested.
- Keep functions focused; split large components into helpers.

## UI Style
- Keep the UI in a Windows XP silver/gray theme.
- Prefer soft gradients, beveled edges, and clear focus states.
- Maintain generous spacing for readability and accessibility.

## Game Descriptions
- Conway's Game of Life: A simulation sandbox with step/run controls, randomize (about 1/3 filled), speed slider, and classic presets (glider, pulsar, lightweight ship).
- Minesweeper: A classic grid with beginner/intermediate/expert sizes, first-click safety, flagging, timer, and a reset face.
- Tetris: Classic falling tetrominoes with next preview, line clears, score, and keyboard controls.
- Snake: A grid-based classic with growing length, speed ramping, and keyboard controls.
- Breakout: Paddle-and-brick arcade classic with angle control, lives, and keyboard controls.

## Testing & Validation
- If tests are added later, follow existing patterns.
- Manually verify the menu and return flow after changes.
