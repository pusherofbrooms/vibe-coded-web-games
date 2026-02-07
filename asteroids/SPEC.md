# Asteroids Clone - Technical Specification

## Overview

A browser-based implementation of the classic arcade game Asteroids using HTML5 Canvas and vanilla JavaScript. All processing occurs in the browser with minimal static server requirements.

## Game Requirements

### Core Gameplay

- Player controls a ship in a 2D space with screen wrapping
- Destroy asteroids to score points
- Avoid collisions with asteroids
- Limited ammo and lives
- Progressive difficulty with increasing asteroid count

### Technical Requirements

- **Canvas**: 800x600 pixels
- **Frame Rate**: 60 FPS (target)
- **Physics**: Inertia-based movement (no friction)
- **Rendering**: HTML5 2D Canvas API

## Game Objects

### Ship

**Properties:**
- `x, y`: Position (center of ship)
- `velocityX, velocityY`: Velocity vector
- `rotation`: Angle in radians (0 = pointing right)
- `radius`: 15 pixels
- `thrust`: 200 pixels/second²
- `turnSpeed`: 3 radians/second
- `shootCooldown`: 200ms
- `lives`: 3

**Behavior:**
- Rotates left/right when keys pressed
- Thrusts in direction of rotation when key pressed
- Shoots bullets in direction of rotation
- Wraps around screen edges
- Respawns after death with 3-second invulnerability

### Asteroids

**Properties:**
- `x, y`: Position
- `velocityX, velocityY`: Velocity vector
- `radius`: 40 (large), 25 (medium), 15 (small)
- `vertices`: Array of (x, y) offsets for polygon shape
- `rotationSpeed`: Random, -1 to 1 radians/second
- `rotation`: Current rotation angle

**Behavior:**
- Random starting positions outside ship area
- Random velocity (50-150 pixels/second)
- Constant rotation
- Wraps around screen edges
- Splits into two medium asteroids when hit (if large/medium)
- Medium splits into two small asteroids
- Small asteroids destroy on hit

### Bullets

**Properties:**
- `x, y`: Position
- `velocityX, velocityY`: Velocity vector
- `radius`: 2 pixels
- `life`: 2 seconds
- `age`: Current age in seconds

**Behavior:**
- Created at ship position, moving in ship's rotation direction
- Velocity: ship velocity + 400 pixels/second in direction
- Self-destructs after 2 seconds
- Wraps around screen edges

## Input Handling

**Controls:**
- `ArrowLeft`, `KeyA`: Rotate ship left
- `ArrowRight`, `KeyD`: Rotate ship right
- `ArrowUp`, `KeyW`: Thrust ship forward
- `Space`: Shoot bullet

**Implementation:**
- Track currently pressed keys in object
- Poll key state each frame for smooth movement
- Single press for shooting (cooldown applies)

## Collision Detection

### Ship vs Asteroid

- Distance check: `distance(ship, asteroid) < (ship.radius + asteroid.radius)`
- Ship respawns if hit (after invulnerability period)
- Asteroid destroyed

### Bullet vs Asteroid

- Distance check: `distance(bullet, asteroid) < (bullet.radius + asteroid.radius)`
- Both bullet and asteroid destroyed (unless asteroid splits)

### Bullet vs Ship

- No collision (ship is invulnerable briefly after shooting)

## Scoring

- Small asteroid: 100 points
- Medium asteroid: 50 points
- Large asteroid: 20 points

## Game States

### Menu
- Display title and instructions
- Start game on space press

### Playing
- Active gameplay
- Update and draw all objects
- Track score and lives

### Game Over
- Display final score
- High score (if applicable)
- Restart on space press

## Level Progression

- Start with 5 large asteroids
- Each level adds 1 asteroid (max 10)
- New level when all asteroids destroyed
- Ship respawns at center of screen

## File Structure

```
index.html          # Main HTML file
js/
  main.js           # Game loop, state management
  ship.js           # Ship class
  asteroid.js       # Asteroid class
  bullet.js         # Bullet class
  input.js          # Input handling
  collision.js      # Collision detection
  ui.js             # UI rendering
```

## Initialization Flow

1. Load all JS files in dependency order
2. Initialize canvas context
3. Set up input listeners
4. Create initial asteroids
5. Start game loop
6. Render initial state (menu)

## Physics Implementation

### Movement

```javascript
// Acceleration based on rotation
accelX = thrust * cos(rotation)
accelY = thrust * sin(rotation)

// Update velocity
velocityX += accelX * deltaTime
velocityY += accelY * deltaTime

// Update position
x += velocityX * deltaTime
y += velocityY * deltaTime
```

### Screen Wrapping

```javascript
if (x < 0) x = canvasWidth
if (x > canvasWidth) x = 0
if (y < 0) y = canvasHeight
if (y > canvasHeight) y = 0
```

## Asteroid Generation

```javascript
function createAsteroid(radius) {
  // Random position outside ship area
  // Random velocity direction and magnitude
  // Generate polygon vertices
}
```

## Rendering

### Ship

- Draw triangle pointing right at origin
- Rotate by ship's rotation
- Translate to ship's position
- Draw thrust flame when accelerating

### Asteroids

- Draw polygon using vertices
- Rotate vertices by asteroid's rotation
- Translate to asteroid's position

### Bullets

- Draw small circle

### UI

- Score: Top-left corner
- Lives: Top-right corner
- Messages: Center of screen

## Edge Cases

- Ship respawning on top of asteroid → move ship away
- Shooting while rotating → bullet inherits ship's velocity
- Multiple asteroids splitting simultaneously → avoid overlap
- Screen wrapping during collision → check both positions