# Space Shooter: additional specs

This adds to `Specification.md`. Where they disagree, the original spec wins, except for the correction listed under "Corrections to the spec".

Units: the game runs at 33 ticks a second (`rate` in `cart.json`). The screen is 160 by 120 pixels, and the ship is fixed at its centre (80, 60). Speeds are given in pixels a second, with pixels a tick in brackets.

## Decided by the owner

The owner's decisions, as they stand:

- **Game loop:** the game ends when health reaches 0. Kills score points. Select starts and restarts a game. A high-score board is kept on the iPod.
- **Spawning:** "Asteroid 50% / Stalker 40% / Fighter 10%" are the odds of each kind when an enemy spawns. Enemies spawn at random on the map, 5 a second at the start, and faster over time.
- **Enemy cap:** up to 100 enemies alive, the cap rising over about 3 minutes.
- **Enemy health:** asteroid 5, stalker 3, fighter 8.
- **Contact:** if the ship touches an asteroid or a stalker, the ship loses 1 health and the enemy is destroyed.
- **Map:** 480 by 480 pixels, wrapping. The player never sees or feels the edge: no border, no marker, nothing that changes there.
- **Auto-aim target:** the nearest enemy that is visible on the screen.
- **Ship's bullets:** they disappear when they leave the screen. There is no time limit on them.
- **Fighters' bullets:** they last 2.5 s, however often they wrap.
- **Asteroid direction:** each asteroid gets a random direction when it spawns and keeps it.
- **Off-screen updates:** enemies and bullets off the screen are updated in a rotation, less often than those on it.
- **Drawing:** kept cheap enough for an iPod Video playing music, with simpler, pre-drawn shapes.
- **Stopping:** when the finger lifts, the ship slows to a stop within 0.5 s.
- **Ultimate trigger:** lifting the finger fires the ultimate when its bar is full.
- **Ultimate:** every enemy the ring reaches is hurt and pushed away, both less further out. The damage is 10 at the ship, falling linearly to 0 at 60 px. The push is about 2.3 times as hard as at first. Enemy bullets it reaches are cleared.
- **Being hit:** while the ship blinks after a hit, it cannot be hurt. At the moment it is hit, every enemy near it is pushed away as hard as the ultimate pushes, but not hurt, and enemy bullets there are cleared.
- **Ultimate bar:** a horizontal bar in the top-right corner, a third of the screen wide.

## Corrections to the spec

How this line of `Specification.md` is read:

- "when they collide into an asteroid" (Asteroid) reads as "when the ship collides with an asteroid".

## Game flow

The screens, in the order the player meets them:

1. **Title:** "SPACE SHOOTER", "TOUCH THE WHEEL TO MOVE", "LIFT YOUR FINGER: ULTIMATE", "SELECT TO START", and the best score, over a drifting starfield.
2. **Play:** the game itself.
3. **Dying:** at 0 health the ship explodes. Play freezes for 1 second, but particles keep moving.
4. **Game over:** "GAME OVER", the score, the best score, and "SELECT TO RESTART". The score goes to the board with `score.submit`. A new top-ten entry opens the table with `score.show`.

Select on the title and game-over screens starts a game. The Menu button is left to the iPod's own pause menu (no `menu_button` in `cart.json`).

## Map

| Item | Value |
|---|---|
| Size | 480 by 480 px, three screens wide and four high |
| Edges | Wrap: anything leaving one edge comes back at the opposite edge. This applies to the ship, every enemy and every fighter's bullet. |
| What the player sees | No edge at all. Enemies and bullets across the wrap are drawn where they would be if the map went on, so nothing appears or vanishes at the edge. |
| Distance | Always measured the shortest way, which may cross the wrap. This applies to auto-aim, the stalker's chase, the fighter's chase and aim, the ultimate's reach, a hit's push, and every collision. |

The ship, every enemy and every fighter's bullet has a position on the map. Each also keeps its position relative to the ship, wrapped to within 240 px either way, which is the shortest way to it. The camera keeps the ship in the middle of the screen.

### How often things are updated

How often each thing moves depends on its distance from the ship:

| Zone | Where | Enemies updated | Fighters' bullets updated |
|---|---|---|---|
| In view | within 96 × 76 px of the ship: the screen and 8 px round it | every tick | every tick |
| Near | out to 124 × 104 px: 28 px further | every 2nd tick | every tick |
| Far | the rest of the map | every 8th tick | every 8th tick |

A thing updated after several ticks moves by all of them at once, including any push it is under. Each enemy's turn in the rotation is set when it spawns. The zones are wide enough that nothing can jump into view: in tests, no enemy on the screen moved more than 3.04 px in a tick, which is the ship's top speed plus a stalker's.

## Player

| Item | Value |
|---|---|
| Starting health | 5 hearts. No healing in this iteration. |
| Max speed | 60 px/s (1.8 px/tick) |
| Acceleration | From 0 to max in 0.5 s (16 ticks), linear, while a finger is on the wheel |
| Finger lifted (`wheelpos()` is -1) | Slows to a stop in at most 0.5 s: 0.1125 px/tick less each tick, still on its last heading |
| Direction | `wheelpos()` 0-95 maps straight to 96 headings, with 0 at the top and going clockwise. No smoothing. |
| Finger moved round while touching | Heading changes at once and speed is kept |
| Facing with no finger | Keeps the last heading |
| Prev / Next / Play pressed | Ignored as buttons. Touching the wheel to press them still steers, and lifting off fires a ready ultimate. |
| After a hit | Blinks and cannot be hurt for 1 s (33 ticks). An enemy touched during this time is still destroyed, but the ship takes no damage and there is no push. |
| Collision radius | 4 px |

## Player bullets

| Item | Value |
|---|---|
| Fire rate | One every 8 ticks (about 4 a second), automatic |
| Target | The nearest enemy that is at least partly visible on the screen: its centre no further outside the screen than its radius. No target means no shot. |
| Path | Straight line, aimed at the target when fired. Not homing. |
| Speed | 150 px/s (4.5 px/tick) |
| Life | Until it hits an enemy or its centre leaves the screen |
| Damage | 1. The bullet is removed on hitting any enemy. |
| Enemy bullets | Not affected. The two kinds of bullet pass through each other. |
| Collision radius | 1 px |

## Ultimate

| Item | Value |
|---|---|
| Cooldown | 7 s (231 ticks). The bar starts empty, so the first ultimate is ready 7 s into a game. |
| Trigger | The finger lifting off the wheel while the bar is full. Lifting earlier does nothing. |
| Ring | Grows from radius 0 to R = 60 px over 16 ticks (0.5 s) |
| Damage | 10 × (1 − distance / R), to the nearest whole point, at the moment the ring's radius reaches the enemy, once per enemy: 10 at the ship, 5 at 30 px, 0 from 58 px. An enemy given 0 is only pushed. |
| Push | Away from the ship. 93 px × (1 − distance / R) in all, spread evenly over 16 ticks. Nothing beyond R. A pushed asteroid carries on in its own direction afterwards. |
| Enemy bullets | Removed when the ring reaches them |

At full health, the ultimate destroys an asteroid (5 health) within 33 px, a stalker (3) within 45 px and a fighter (8) within 15 px. Enemies already damaged by shots die further out.

## Being hit

When the ship loses a heart, the following happens at once:

1. The ship starts blinking, and cannot be hurt for 1 s.
2. The screen shakes for 6 ticks.
3. Every enemy within R = 60 px of the ship gets the same push as from the ultimate, 93 px × (1 − distance / R) over 16 ticks. It takes no damage.
4. Every enemy bullet within R is removed.

A touch or a bullet during the blinking causes none of this.

## Enemies

Enemies pass through each other. All collision tests are circle against circle. Every enemy wraps at the map's edges.

| Kind | Spawn odds | Health | Speed | Radius | Points |
|---|---|---|---|---|---|
| Asteroid | 50% | 5 | 18 px/s (30%) | 6 px | 1 |
| Stalker | 40% | 3 | 42 px/s (70%) | 4 px | 1 |
| Fighter | 10% | 8 | 18 px/s (30%) | 5 px | 3 |

**Asteroid:** drifts in a straight line, in a direction picked at random when it spawns. It never changes direction. Contact costs the ship 1 health and destroys the asteroid.

**Stalker:** heads straight at the ship, the shortest way across the wrap. In view, it aims again every 2nd tick. Contact costs the ship 1 health and destroys the stalker.

**Fighter:** flies towards the ship until it is 50 px away, then holds that distance and circles slowly. Once within 100 px it fires one bullet every 2 s (66 ticks), aimed at the ship's position when it fires. Contact costs the ship 1 health and destroys the fighter.

**Fighter bullets:** 72 px/s (1.2× the ship's max speed), last 2.5 s however often they wrap, have a 1 px radius, and cost the ship 1 health. They hit only the player.

## Spawning

| Item | Value |
|---|---|
| Where | A random point on the map. A point on the screen, or within 12 px of it, is picked again, so nothing appears in view or on top of the ship. |
| First interval | One enemy every 6.6 ticks (5 a second) |
| Ramp | The interval drops by 0.2 ticks every 5 s, down to 2 ticks (about 16 a second). The fraction left over carries to the next spawn, so the average rate is exact. |
| Cap | 12 enemies alive at first, rising by 1 every 2 s to 100 (reached after about 3 minutes) |

Enemies are only removed by dying.

## Score

Score is an integer: 1 point for an asteroid, 1 for a stalker, 3 for a fighter. Kills by the ultimate also score. An enemy destroyed by touching the ship gives no points. There is one board, `BOARD.best`, declared under `boards` in `cart.json`.

## Performance

A game must keep 33 ticks a second on the slowest case, an iPod Video playing FLAC: about 12,500 units a tick.

| Case | Measured |
|---|---|
| Normal play (the test player loses every 20 to 30 s) | worst tick about 8,000 |
| Enemies alive up to about 48 | worst tick about 12,000 |
| 100 enemies alive (a test ship that cannot die) | about 15,700 on average |

So the slowest iPod falls behind only after about 55 enemies are alive. An iPod Classic (about 175,000 units a tick) and a Video with no music playing (about 46,000) keep up throughout.

## Graphics

Shapes are drawn with primitives. The ones drawn most often are drawn once at the start into images or a sprite sheet, and copied from there each frame. Colours are picked with `rgb(0x...)`.

### Background
- The background is cleared to deep navy `0x0a0a1e` every frame.
- The starfield has 24 stars in 3 depths, 8 at each, which move with the ship at 25%, 50% and 100%. The far stars are dim grey `0x404060` dots, the middle ones grey-blue `0x8080a0`, and the near ones white `0xffffff`. They wrap at the screen edges, so the player can see the ship moving even with no enemies around. They take no part in the map's wrap, which is one reason the map's edge cannot be seen.

### Player ship
- A white `0xffffff` arrowhead, 9 px nose to tail, with a cyan `0x40e0ff` cockpit pixel. It is drawn once at the start at 32 angles, and the one nearest the heading is shown.
- While moving, an orange `0xff8020` flame flickers behind it. Its length changes each tick and grows with speed.
- While it cannot be hurt after a hit, it is drawn only on alternate 3-tick spans, so it blinks.

### Enemies
- **Asteroid:** an irregular polygon with 8 vertices at random radii of 5-7 px. Fill is grey `0x707070` and the outline is light grey `0xa0a0a0`. There are 6 shapes, each drawn once at the start at 16 angles, so an asteroid turns slowly in 22.5° steps.
- **Stalker:** a red `0xff3030` diamond about 7 px long, pointed at the ship. It pulses between two widths. It is an 8×8 sprite drawn at the start at 16 angles.
- **Fighter:** the player's arrowhead shape in magenta `0xff40c0`, pointed at the ship. It is drawn at the start at 16 angles in three colours: magenta, a darker `0x902070` at 1 health, and white for the hit flash. A single orange pixel flickers behind it as a flame.
- **Hit flash:** a fighter that takes damage but survives is drawn white for 2 ticks.
- Enemies off the screen are not drawn.

### Bullets
- Player bullets are 3 px yellow `0xffff40` lines along their direction of travel.
- Fighter bullets are pink-red `0xff6080` filled circles, radius 1, so they read as dangerous.

### Effects
- **Explosion:** a `particles.emit` burst in the enemy's colour: 8 particles for an asteroid or stalker, 16 for a fighter. They live 10-20 ticks, with drag.
- **Player hit:** the screen shakes for 6 ticks (`camera(rnd(5) - 2, rnd(5) - 2)`, then `camera()` before the HUD). A red `0xff2020` circle grows from the ship to R = 60 px over 8 ticks, showing the push.
- **Player death:** a 24-particle white and orange burst.
- **Ultimate ring:** while it is white or light blue, two `circ` rings 2 px apart; once dark blue, one. It grows to R and fades from white `0xffffff` to light blue `0x80c0ff` to dark blue `0x304080`, and a sparser `fillp` dither on the last third makes it fade out.

### HUD
- **Hearts:** one red `0xff3040` 7x6 heart per point of health, top-left, starting at (2, 2) and 8 px apart.
- **Score:** white digits, top-centre.
- **Ultimate bar:** top right, a third of the screen wide: a dark blue `0x304080` frame from x 106 to 159 and y 1 to 5, with the bar inside it, 52 px long and 3 px tall. It fills from its left end towards the corner in proportion to the charge, white while charging. At 100% it fills the frame and blinks between red `0xff2020` and dark red `0x601010` every 8 ticks.
- The HUD is drawn last, with the camera reset, so screen shake doesn't move it.

## Not in this iteration

These are left out on purpose, following `Specification.md`:

- anything on the map besides enemies and bullets (terrain, walls, obstacles)
- weapons other than the bullet
- healing and pick-ups
- music
