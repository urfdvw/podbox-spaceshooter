# Space Shooter

## Game design idea

The spaceship in the center will shoot surrounding objects that have different behavior.

## UI

The spaceship is locked in the UI in the center. Its direction is controlled by the touch position of the click wheel.

Objects and the map surrounding it are moved when the user touches the click wheel. For example if the user touches left, that means the spaceship should move left. But on the UI the spaceship is locked so everything on the background, including objects and the map, should move right. A bullet, missile, or any object that is shot by the spaceship is also considered an object.

Side note: in this first iteration `spaceship` can also only shoot a bullet.

Health is an integer which is shown on the top-left corner as the `num`, as a number of hearts.

The ultimate cooldown should be a horizontal bar in the top-right corner, a third of the screen wide:
- It fills from its left end towards the top-right corner.
- It should be white while progressing.
- When it reaches 100%, it should fill the whole bar and change to blinking red.

## Mechanism

### Map

Map is a confined square area, and circular on edges. If anything, ship, bullets or enemies reach one edge, they will be transported to the opposite edge.

### Control

Touch the click wheel, (not pressing any button on the click wheel) will move the spaceship into that direction. There is a set max speed for the spaceship. When your finger is first on the click wheel, the speed should increase slowly, and when your finger releases from the click wheel, the spaceship slows down and stops within half a second.

By slowly, I mean there is an acceleration process, not that it's very slow: the spaceship should reach its maximum speed within half a second.

Bullets are shot automatically.

Lifting your finger from the click wheel executes the ultimate, when its cooldown is complete.

When the spaceship is attacked, it blinks for a moment and cannot be hurt while it blinks. At the moment it is attacked, it pushes every enemy around it outward with the same force as the ultimate, but without hurting them, and removes the bullets it reaches.

### Bullets

Bullets should shoot in a period, but pretty frequent.

Each bullet flies on its own. When it reaches an enemy, it will cause some damage.

Each bullet has its own behavior and does not depend on the ship anymore.

The spaceship's bullets disappear when they leave the screen.

Bullet direction will be the direction from the spaceship to the closest enemy (aka auto-lock), and this behavior cannot be changed.

Also note that this direction isn't controlled by the user or related to the moving direction.

# Ultimate

Ultimate is centered on the spaceship. It attacks all surrounding enemies and pushes them back hard, but the further away, the less the effect: its damage is 10 at the spaceship and falls linearly to 0 at 60 px, and its push weakens the same way. It removes the bullets it reaches.

Ultimate is shown as a circle that became larger and larger, but fainter and fainter.

Ultimate cooldown is designed to be seven seconds in this iteration.

## Enemies

For this iteration, one bullet on the enemy will cause one health damage on the enemy.

Speed is measured as a percentage of the max speed of the spaceship.

### Asteroid 50%

- health: 5
- speed: 30%

Asteroids are floating objects that don't have any attack behavior, but when they collide into an asteroid, one health will be removed.

Move direction is predefined and will not change.

### Stalker 40%

- health: 3
- speed: 70%

Stalker is a kind of enemy that follows the spaceship. It will choose the shortest direction to the spaceship.

### Fighter 10%

- health: 8
- speed: 30%

Fighters are the kind of spaceship that is the same as the player, but they are controlled by AI. They move slower than Stalker, and they also move towards the player spaceship.

The most important thing is that they shoot bullets, and their bullets aim towards the spaceship. If the spaceship collides into a fighter, it will cause one health damage; a bullet also causes one health damage.
