# Asteroids Clone - Development Guide

## Quick Start

```bash
# Serve the game (any static server works)
python -m http.server 8000
# Open http://localhost:8000
```

## Tech Stack
- **Vanilla JS/HTML/CSS** - No build tools required
- **2D Canvas API** - Browser-native rendering

## Project Structure

```
asteroids/
├── index.html          # Entry point - loads all JS files
├── AGENTS.md           # This file
├── SPEC.md             # Technical specification
└── js/
    ├── main.js         # Game loop & initialization
    ├── ship.js         # Player ship class
    ├── asteroid.js     # Asteroid class
    ├── bullet.js       # Bullet/projectile class
    ├── input.js        # Keyboard input handling
    ├── collision.js    # Collision detection
    └── ui.js           # UI rendering (score, lives, messages)
```

## Game Loop

1. `update(deltaTime)` - Physics, movement, collisions
2. `draw(ctx)` - Render all objects to canvas
3. Repeat via `requestAnimationFrame`

## Classes & Responsibilities

### Ship (`ship.js`)
- Position, velocity, rotation
- Thrust physics with inertia
- Shooting mechanism with cooldown
- Screen wrapping

### Asteroid (`asteroid.js`)
- Random positions/sizes/speeds
- Polygon shapes with vertices
- Split logic (large → medium → small)
- Screen wrapping

### Bullet (`bullet.js`)
- Linear trajectory
- Lifetime management (2 seconds)
- Collision detection

### Input (`input.js`)
- Keyboard listeners (arrows, WASD, space)
- Track pressed keys
- Pass to ship for movement

### Collision (`collision.js`)
- Circle-based collision for asteroids
- Polygon-circle for ship/asteroids

### UI (`ui.js`)
- Score display (top left)
- Lives indicator (top right)
- Game over / start screen

## Key Mechanics

1. **Screen Wrapping**: Objects exiting one edge appear on opposite edge
2. **Asteroid Splitting**: Large → 2 medium → 2 small (no split at smallest)
3. **Lives System**: Ship respawns after death (3 total)
4. **Level Progression**: More asteroids as score increases
5. **Physics**: Inertia-based movement, no friction in space

## Controls

- **Arrow Keys / WASD**: Rotate and thrust ship
- **Space**: Shoot

## File Dependencies

Load in this order (in `index.html`):
1. `js/input.js` - Input handling first
2. `js/collision.js` - Collision detection
3. `js/bullet.js` - Bullet class
4. `js/asteroid.js` - Asteroid class
5. `js/ship.js` - Ship class
6. `js/ui.js` - UI rendering
7. `js/main.js` - Game loop (depends on all above)