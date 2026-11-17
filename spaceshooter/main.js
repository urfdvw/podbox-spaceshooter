// Space Shooter: the ship stays in the middle of the screen and the world
// moves round it. Touch the wheel to fly that way; shots aim themselves at
// the nearest enemy; lifting the finger fires the ultimate once its bar is
// full.
//
// The map is a square of MAPW that wraps. The ship, the foes and the
// fighters' shots have places on it (x, y, 0 to MAPW); each also keeps where
// it is from the ship (rx, ry), within HALFW either way: the shortest way to
// it, across the edge or not, so what lies across the edge is drawn where it
// would be if the map went on. The camera puts the ship in the middle of
// the screen. A foe in view (within VIEWX, VIEWY) is moved every tick, one
// near it (within NEARX, NEARY) every 2nd tick, and one further off every
// SLOW ticks, each by as many ticks at once, in a turn set when it was
// made; its near field says which. Fighters' shots are moved every tick
// when near, every SLOW ticks otherwise. The ship's own shots live only on
// the screen, so they are kept from the ship alone.

const MAXS = 1.8;           // the ship's top speed, px a tick (60 px/s)
const ACC = 0.1125;         // MAXS / 16: top speed in half a second, and
                            // to a stop in half a second
const SP_STALK = 1.26;      // 70% of MAXS
const SP_FIGHT = 0.54;      // 30% of MAXS
const SP_ROCK = 0.54;       // 30% of MAXS
const SP_SHOT = 4.5;        // 150 px/s
const SP_ESHOT = 2.16;      // 1.2 x MAXS
const ESHOT_LIFE = 82;
const FIRE_EVERY = 8;
const FIGHT_FIRE = 66;
const INV_TICKS = 33;
const ULT_CHARGE = 231;     // 7 s
const ULT_R = 60;
const ULT_GROW = 16;
const ULT_DMG = 10;         // the ultimate's damage at the middle, 0 at ULT_R
const PUSH = 93.0;          // the push at the middle of the ultimate or a hit,
const PUSH_T = 16;          // over this many ticks, less further out
const WAVE_T = 8;           // ticks the ring of a hit is shown
const NFOES = 100;
const NSHOTS = 12;
const NESHOTS = 24;
const NSTARS = 24;
const NFX = 160;
const MAPW = 480;           // the map, square
const HALFW = 240;
const VIEWX = 96;           // in view: the screen and 8 px round it, moved
const VIEWY = 76;           // every tick
const NEARX = 124;          // near: 28 px further, moved every 2nd tick; more
const NEARY = 104;          // than a slow update can move a thing
const SLOW = 8;             // ticks between updates of what is further off
const ROCK_SHAPES = 6;
const ROCK_TURNS = 16;       // each shape drawn at this many angles

const ROCK = 0;
const STALK = 1;
const FIGHT = 2;

var C_BG = rgb(0x0a0a1e);
var C_WHITE = rgb(0xffffff);
var C_CYAN = rgb(0x40e0ff);
var C_FLAME = rgb(0xff8020);
var C_ROCK = rgb(0x707070);
var C_ROCK_EDGE = rgb(0xa0a0a0);
var C_STALK = rgb(0xff3030);
var C_FIGHT = rgb(0xff40c0);
var C_FIGHT_HURT = rgb(0x902070);
var C_SHOT = rgb(0xffff40);
var C_ESHOT = rgb(0xff6080);
var C_HEART = rgb(0xff3040);
var C_RED = rgb(0xff2020);
var C_DARKRED = rgb(0x601010);
var C_RING2 = rgb(0x80c0ff);
var C_RING3 = rgb(0x304080);
var STAR_C = [rgb(0x404060), rgb(0x8080a0), rgb(0xffffff)];
var DEPTH = [0.25, 0.5, 1.0];
var SB = [0, 8, 16, NSTARS];    // the stars of each depth: SB[d] to SB[d + 1]
var AC = cos(0.375);            // an arrowhead's back corners, 0.375 turns
var AS = sin(0.375);            // round from its nose

var RAD = [6, 4, 5];        // collision radius by kind
var HP = [5, 3, 8];         // health by kind
var PTS = [1, 1, 3];        // points by kind
var BOOM = [8, 8, 16];      // explosion particles by kind

var foes = makeFoes();
var nf = 0;                 // foes[0 .. nf - 1] are the live ones, and any
                            // killed since the last packFoes, with on 0
var killed = 0;             // a foe died: pack the pool on the next tick
var near = new Int32Array(NFOES);          // the foes in view of the ship
var nnear = 0;
var vis = new Int32Array(NFOES);           // the foes on the screen
var nvis = 0;
var nspawned = 0;           // gives each foe its turn in the slow updates
var shipX = 0.0;            // the ship's place on the map
var shipY = 0.0;
var shots = makeShots(NSHOTS);
var eshots = makeShots(NESHOTS);
var sx = new FixArray(NSTARS);
var sy = new FixArray(NSTARS);
var fx;                     // explosions: a particle pool
var pox = 0.0;              // how far the world has moved since the
var poy = 0.0;              // particles' origin: they are drawn offset by it
var lastFx = 0;             // playT of the last explosion
var rockImgs = [];          // shape * ROCK_TURNS + angle, 16x16, middle at 8, 8
var fightImgs = [];         // colour * 16 + angle, 12x12, middle at 6, 6
var shipSheet;              // the sheet: stalkers (pulse * 16 + angle), then the heart (32)
var shipImgs = [];          // the ship at 32 angles, 12x12, middle at 6, 6

var state = 0;              // 0 title, 1 playing, 2 dying, 3 game over
var hp = 5;
var pts = 0;
var ptsStr = "0";
var best = 0;
var bestStr = "BEST 0";
var overStr = "SCORE 0";
var charge = 0;
var heading = 0.25;         // turns; 0.25 is up the screen
var speed = 0.0;
var mvx = 0.0;               // how far the ship moves this tick
var mvy = 0.0;
var inv = 0;
var shake = 0;
var fireT = 0;
var spawnT = 0.0;
var playT = 0;
var ultK = 0;               // the ring's tick, 1 to ULT_GROW; 0 for none
var ultId = 0;
var touching = 0;           // a finger was on the wheel last tick
var lifted = 0;             // it came off this tick
var waveNow = 0;            // the ship was hit: push everything near away
var waveK = 0;              // the hit's ring, WAVE_T down to 1; 0 for none
var deadT = 0;

function makeFoes() {
    var a = [];
    for (var i = 0; i < NFOES; i++) {
        a.push({ on: 0, kind: 0, x: 0.0, y: 0.0, rx: 0.0, ry: 0.0,
                 near: 0, slot: 0, last: 0, hp: 0, flash: 0,
                 px: 0.0, py: 0.0, pt: 0, ult: 0, cool: 0,
                 ang: 0.0, ca: 0.0, sa: 0.0, ai: 0, spin: 0.0, hr: 0, cr: 0,
                 shape: 0, vx: 0.0, vy: 0.0 });
    }
    return a;
}

function makeShots(n) {
    var a = [];
    for (var i = 0; i < n; i++)
        a.push({ on: 0, x: 0.0, y: 0.0, dx: 0.0, dy: 0.0, life: 0,
                 rx: 0.0, ry: 0.0, near: 0, last: 0 });
    return a;
}

function init() {
    fx = particles.pool(NFX);
    fx.drag = 0.08;
    makeRocks();
    makeShips();
    target(SCREEN);
    sheet(shipSheet);
    for (var i = 0; i < NSTARS; i++) {
        sx[i] = rnd(160.0) - 80.0;
        sy[i] = rnd(120.0) - 60.0;
    }
    readBest();
}

// The asteroids, drawn once: copying one is far cheaper than filling it.
function makeRocks() {
    var rr = new FixArray(8);
    var xs = new FixArray(8);
    var ys = new FixArray(8);
    for (var v = 0; v < ROCK_SHAPES; v++) {
        for (var k = 0; k < 8; k++) rr[k] = 5.0 + rnd(2.0);
        for (var t = 0; t < ROCK_TURNS; t++) {
            for (k = 0; k < 8; k++) {
                var a = t / (ROCK_TURNS * 1.0) + k / 8.0;
                xs[k] = 8.0 + cos(a) * rr[k];
                ys[k] = 8.0 + sin(a) * rr[k];
            }
            var im = img(16, 16);
            target(im);
            polyfill(xs, ys, 8, C_ROCK);
            polyline(xs, ys, 8, C_ROCK_EDGE, null, true);
            rockImgs.push(im);
        }
    }
}

// Stalkers as sprites and fighters as images, at 16 angles: copying is far
// cheaper than working out and filling their triangles each time.
function makeShips() {
    shipSheet = img(128, 24);
    target(shipSheet);
    heart(0, 16);
    for (var k = 0; k < 16; k++) {
        var a = k / 16.0;
        var ca = cos(a);
        var sa = sin(a);
        for (var p = 0; p < 2; p++) {
            var w = 2.0 + p;
            var x = 3.5 + (k & 15) * 8;
            var y = 3.5 + p * 8;
            trifill(x + ca * 3.5, y + sa * 3.5, x - sa * w, y + ca * w,
                    x + sa * w, y - ca * w, C_STALK);
            trifill(x - ca * 3.0, y - sa * 3.0, x - sa * w, y + ca * w,
                    x + sa * w, y - ca * w, C_STALK);
        }
    }
    for (k = 0; k < 32; k++) {
        var si = img(12, 12);
        target(si);
        var sa2 = k / 32.0;
        arrow(6.0, 6.0, cos(sa2), sin(sa2), C_WHITE, 0);
        pset(6 + cos(sa2) * 2, 6 + sin(sa2) * 2, C_CYAN);
        shipImgs.push(si);
    }
    var cols = [C_FIGHT, C_FIGHT_HURT, C_WHITE];
    for (var c = 0; c < 3; c++) {
        for (k = 0; k < 16; k++) {
            var im = img(12, 12);
            target(im);
            arrow(6.0, 6.0, cos(k / 16.0), sin(k / 16.0), cols[c], 0);
            fightImgs.push(im);
        }
    }
}

function readBest() {
    var b = score.best(BOARD.best);
    best = b == null ? 0 : b;
    bestStr = "BEST " + best;
}

// ---- update ----


function update() {
    if (state == 0) {
        moveStars(0.3, 0.1);
        if (btnp(4)) startGame();
    } else if (state == 1) {
        updPlay();
    } else if (state == 2) {
        particles.step(fx);
        deadT--;
        if (deadT <= 0) gameOver();
    } else {
        moveStars(0.3, 0.1);
        particles.step(fx);
        if (btnp(4)) startGame();
    }
}

function startGame() {
    var i;
    for (i = 0; i < NFOES; i++) foes[i].on = 0;
    nf = 0;
    nvis = 0;
    nnear = 0;
    killed = 0;
    shipX = 0.0;
    shipY = 0.0;
    for (i = 0; i < NSHOTS; i++) shots[i].on = 0;
    for (i = 0; i < NESHOTS; i++) eshots[i].on = 0;
    fill(fx.life, 0);
    pox = 0.0;
    poy = 0.0;
    hp = 5;
    pts = 0;
    ptsStr = "0";
    charge = 0;
    heading = 0.25;
    speed = 0.0;
    mvx = 0.0;
    mvy = 0.0;
    inv = 0;
    shake = 0;
    fireT = 0;
    spawnT = 0.0;
    playT = 0;
    ultK = 0;
    touching = 0;
    lifted = 0;
    waveNow = 0;
    waveK = 0;
    state = 1;
}

function updPlay() {
    playT++;

    // The finger's place on the wheel is the way to fly; lifting it slows
    // the ship to a stop, and fires the ultimate if it is ready.
    var p = wheelpos();
    lifted = 0;
    if (p >= 0) {
        heading = 0.25 - p / 96.0;
        if (heading < 0) heading += 1.0;
        speed = min(MAXS, speed + ACC);
    } else {
        speed = max(0.0, speed - ACC);
        lifted = touching;
    }
    touching = p >= 0;
    mvx = cos(heading) * speed;
    mvy = sin(heading) * speed;
    if (speed > 0) {
        shiftWorld(mvx, mvy);
        shipX += mvx;
        shipY += mvy;
        if (shipX < 0) shipX += MAPW; else if (shipX >= MAPW) shipX -= MAPW;
        if (shipY < 0) shipY += MAPW; else if (shipY >= MAPW) shipY -= MAPW;
    }

    if (killed) packFoes();
    updFoes();
    updUlt();
    fireShots();
    updShots();
    updEShots();
    if (waveNow) { wave(); waveNow = 0; }
    if (waveK > 0) waveK--;
    spawnFoes();
    particles.step(fx);
    if (playT - lastFx > 40) { pox = 0.0; poy = 0.0; }   // every particle is gone

    if (inv > 0) inv--;
    if (shake > 0) shake--;
    if (hp <= 0) die();
}

// The stars and particles move the other way, so the ship seems to fly;
// foes and fighters' shots are seen from the ship's new place.
function shiftWorld(mx, my) {
    moveStars(mx, my);
    pox += mx;                  // particles move by the camera instead
    poy += my;
}

function moveStars(mx, my) {
    for (var d = 0; d < 3; d++) {
        var ddx = mx * DEPTH[d];
        var ddy = my * DEPTH[d];
        var end = SB[d + 1];
        for (var i = SB[d]; i < end; i++) {
            var x = sx[i] - ddx;
            var y = sy[i] - ddy;
            if (x < -80) x += 160; else if (x >= 80) x -= 160;
            if (y < -60) y += 120; else if (y >= 60) y -= 120;
            sx[i] = x;
            sy[i] = y;
        }
    }
}

// The ultimate: a ring from the ship out to ULT_R. Each enemy it reaches is
// hurt and pushed away, both less the further out it is; enemy shots it
// reaches are gone.
function updUlt() {
    if (ultK >= ULT_GROW) ultK = 0;
    else if (ultK > 0) ultK++;

    if (ultK == 0) {
        if (charge < ULT_CHARGE) charge++;
        else if (lifted) { ultK = 1; ultId++; charge = 0; }
    }
    if (ultK == 0) return;

    var r = ULT_R * ultK / ULT_GROW;
    var r2 = r * r;
    var i, dx, dy, d2;
    for (var n = 0; n < nnear; n++) {           // ULT_R is within the view area
        var f = foes[near[n]];
        if (!f.on || f.ult == ultId) continue;
        dx = f.rx | 0;
        dy = f.ry | 0;
        d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        f.ult = ultId;
        push(f, d2);
        // ULT_DMG at the middle down to 0 at ULT_R, to the nearest whole point
        var dmg = (ULT_DMG * (ULT_R - sqrt(d2)) + (ULT_R >> 1)) / ULT_R;
        if (dmg > 0) hurt(f, dmg);
    }
    for (i = 0; i < NESHOTS; i++) {
        var e = eshots[i];
        if (!e.on || !e.near) continue;
        dx = e.rx | 0;
        dy = e.ry | 0;
        if (dx * dx + dy * dy <= r2) e.on = 0;
    }
}

// Sets foe f, d2 (a whole number) squared from the ship and within ULT_R,
// moving away from the ship: PUSH at the middle, less further out.
function push(f, d2) {
    var s = (PUSH / PUSH_T) * (ULT_R - sqrt(d2)) / ULT_R;
    var a = atan2(f.rx, f.ry);
    f.px = cos(a) * s;
    f.py = sin(a) * s;
    f.pt = PUSH_T;
}

// The ship has been hit: every foe within ULT_R is pushed away as the
// ultimate pushes, unharmed, and the fighters' shots there are gone.
function wave() {
    var r2 = ULT_R * ULT_R;
    var dx, dy, d2;
    for (var n = 0; n < nnear; n++) {
        var f = foes[near[n]];
        if (!f.on) continue;
        dx = f.rx | 0;
        dy = f.ry | 0;
        d2 = dx * dx + dy * dy;
        if (d2 <= r2) push(f, d2);
    }
    for (var i = 0; i < NESHOTS; i++) {
        var e = eshots[i];
        if (!e.on || !e.near) continue;
        dx = e.rx | 0;
        dy = e.ry | 0;
        if (dx * dx + dy * dy <= r2) e.on = 0;
    }
    waveK = WAVE_T;
}

// Moves the foes whose turn it is: those in view every tick, those near
// every 2nd tick, the rest every SLOW ticks. Lists those in view in near
// (the ultimate and a hit's push reach no further), and those on the screen
// in vis.
function updFoes() {
    nvis = 0;
    nnear = 0;
    var turn = playT & (SLOW - 1);
    for (var i = 0; i < nf; i++) {
        var f = foes[i];
        if (!f.on) continue;
        var tier = f.near;                      // 2 in view, 1 near, 0 far
        if (tier == 1 ? ((playT ^ f.slot) & 1) != 0 : (tier == 0 && f.slot != turn))
            continue;
        var n = playT - f.last;                 // ticks since it last moved
        f.last = playT;
        var rx, ry;
        if (tier == 2 && n == 1) {
            // moved last tick: only the ship's move since, and no wrap so near
            rx = f.rx - mvx;
            ry = f.ry - mvy;
        } else {
            rx = f.x - shipX;
            ry = f.y - shipY;
            if (rx < -HALFW) rx += MAPW; else if (rx >= HALFW) rx -= MAPW;
            if (ry < -HALFW) ry += MAPW; else if (ry >= HALFW) ry -= MAPW;
        }
        var a, d2, ca, sa, mx, my;

        if (f.kind == ROCK) {
            mx = f.vx * n;                      // its own way, never changed
            my = f.vy * n;
            f.ang += f.spin * n;
            if (f.ang >= 1.0) f.ang -= 1.0;
            else if (f.ang < 0) f.ang += 1.0;
        } else if (f.kind == STALK) {
            if (n > 1 || ((playT ^ f.slot) & 1) == 0) {   // aim every 2nd tick
                a = atan2(-rx, -ry);
                f.ca = cos(a);
                f.sa = sin(a);
                f.ai = ((a * 16.0 + 0.5) | 0) & 15;
            }
            ca = f.ca;
            sa = f.sa;
            mx = ca * (SP_STALK * n);
            my = sa * (SP_STALK * n);
        } else {
            if (f.flash > 0) f.flash--;
            var dx = rx | 0;
            var dy = ry | 0;
            d2 = dx * dx + dy * dy;
            a = atan2(-rx, -ry);
            ca = cos(a);
            sa = sin(a);
            f.ca = ca;
            f.sa = sa;
            f.ai = ((a * 16.0 + 0.5) | 0) & 15;
            var m = SP_FIGHT * n;
            if (d2 < 2025) {                    // under 45 px: back off
                mx = -ca * m;
                my = -sa * m;
            } else if (d2 <= 3025) {            // 45-55 px: circle
                mx = sa * m;
                my = -ca * m;
            } else {                            // close in
                mx = ca * m;
                my = sa * m;
            }
            f.cool -= n;
            if (f.cool <= 0 && d2 <= 10000) {
                fireEnemy(f.x, f.y, rx, ry, ca, sa);
                f.cool = FIGHT_FIRE;
            }
        }
        if (f.pt > 0) {                         // being pushed: catch up too
            var k = min(n, f.pt);
            mx += f.px * k;
            my += f.py * k;
            f.pt -= k;
        }

        var x = f.x + mx;
        var y = f.y + my;
        if (x < 0) x += MAPW; else if (x >= MAPW) x -= MAPW;
        if (y < 0) y += MAPW; else if (y >= MAPW) y -= MAPW;
        f.x = x;
        f.y = y;
        rx += mx;
        ry += my;
        if (rx < -HALFW) rx += MAPW; else if (rx >= HALFW) rx -= MAPW;
        if (ry < -HALFW) ry += MAPW; else if (ry >= HALFW) ry -= MAPW;
        f.rx = rx;
        f.ry = ry;
        var ax = abs(rx);
        var ay = abs(ry);
        f.near = ax <= VIEWX && ay <= VIEWY ? 2 : (ax < NEARX && ay < NEARY ? 1 : 0);
        if (f.near < 2) continue;

        var rr = f.cr;
        if (abs(rx) < rr && abs(ry) < rr && rx * rx + ry * ry < rr * rr) {
            kill(f, false);
            hitShip();
            continue;
        }
        near[nnear] = i;                        // ULT_R is within the view area
        nnear++;
        if (ax <= 88 && ay <= 68) { vis[nvis] = i; nvis++; }
    }
}

// Keeps the live foes at the front of the pool, so loops stop at nf.
function packFoes() {
    var j = 0;
    for (var i = 0; i < nf; i++) {
        var f = foes[i];
        if (!f.on) continue;
        if (i != j) { foes[i] = foes[j]; foes[j] = f; }
        j++;
    }
    nf = j;
    killed = 0;
}

function hurt(f, n) {
    f.hp -= n;
    if (f.hp <= 0) kill(f, true);
    else f.flash = 2;
}

function kill(f, scored) {
    f.on = 0;
    killed = 1;
    var c = C_ROCK_EDGE;
    if (f.kind == STALK) c = C_STALK;
    else if (f.kind == FIGHT) c = C_FIGHT;
    particles.emit(fx, BOOM[f.kind], f.rx + pox, f.ry + poy, 0.0, 0.0, 1.2, 15, c);
    lastFx = playT;
    if (scored) {
        pts += PTS[f.kind];
        ptsStr = "" + pts;
    }
}

// Blinking after a hit, the ship is safe: inv is both.
function hitShip() {
    if (inv > 0) return;
    hp--;
    inv = INV_TICKS;
    shake = 6;
    waveNow = 1;                // after every foe has moved this tick
}

function die() {
    particles.emit(fx, 12, pox, poy, 0.0, 0.0, 1.5, 25, C_WHITE);
    particles.emit(fx, 12, pox, poy, 0.0, 0.0, 1.0, 25, C_FLAME);
    speed = 0.0;
    shake = 0;
    deadT = 33;
    state = 2;
}

function gameOver() {
    state = 3;
    overStr = "SCORE " + pts;
    var rank = score.submit(BOARD.best, pts);
    readBest();
    if (rank > 0) score.show(BOARD.best);
}

// Shots fire on their own at the nearest enemy on the screen.
function fireShots() {
    if (fireT < FIRE_EVERY) fireT++;
    if (fireT < FIRE_EVERY) return;
    var tgt = null;
    var bestD = 0;
    for (var v = 0; v < nvis; v++) {
        var f = foes[vis[v]];
        if (!f.on) continue;
        var rad = RAD[f.kind];                  // at least partly on the screen
        if (abs(f.rx) > 80 + rad || abs(f.ry) > 60 + rad) continue;
        var dx = f.rx | 0;
        var dy = f.ry | 0;
        var d2 = dx * dx + dy * dy;
        if (tgt == null || d2 < bestD) { tgt = f; bestD = d2; }
    }
    if (tgt == null) return;
    var s = freeShot(shots, NSHOTS);
    if (s == null) return;
    fireT = 0;
    var a = atan2(tgt.rx, tgt.ry);
    s.on = 1;
    s.x = 0.0;
    s.y = 0.0;
    s.dx = cos(a) * SP_SHOT;
    s.dy = sin(a) * SP_SHOT;
}

function fireEnemy(x, y, rx, ry, ca, sa) {
    var s = freeShot(eshots, NESHOTS);
    if (s == null) return;
    s.on = 1;
    s.x = x;
    s.y = y;
    s.rx = rx;
    s.ry = ry;
    s.near = 1;                 // moves on the next tick, from rx, ry
    s.last = playT;
    s.dx = ca * SP_ESHOT;
    s.dy = sa * SP_ESHOT;
    s.life = ESHOT_LIFE;
}

function freeShot(pool, n) {
    for (var i = 0; i < n; i++)
        if (!pool[i].on) return pool[i];
    return null;
}

// The ship's shots fly until they hit or leave the screen.
function updShots() {
    for (var i = 0; i < NSHOTS; i++) {
        var s = shots[i];
        if (!s.on) continue;
        var x = s.x + s.dx - mvx;
        var y = s.y + s.dy - mvy;
        if (abs(x) > 80 || abs(y) > 60) { s.on = 0; continue; }
        s.x = x;
        s.y = y;
        for (var v = 0; v < nvis; v++) {
            var f = foes[vis[v]];
            if (!f.on) continue;
            var rr = f.hr;
            var dx = f.rx - x;
            var dy = f.ry - y;
            if (abs(dx) < rr && abs(dy) < rr && dx * dx + dy * dy < rr * rr) {
                s.on = 0;
                hurt(f, 1);
                break;
            }
        }
    }
}

// Fighters' shots: near the ship every tick, further off every SLOW ticks.
function updEShots() {
    var turn = playT & (SLOW - 1);
    for (var i = 0; i < NESHOTS; i++) {
        var s = eshots[i];
        if (!s.on || (!s.near && (i & (SLOW - 1)) != turn)) continue;
        var n = playT - s.last;
        s.last = playT;
        s.life -= n;
        if (s.life <= 0) { s.on = 0; continue; }
        var mx = s.dx * n;
        var my = s.dy * n;
        var x = s.x + mx;
        var y = s.y + my;
        if (x < 0) x += MAPW; else if (x >= MAPW) x -= MAPW;
        if (y < 0) y += MAPW; else if (y >= MAPW) y -= MAPW;
        s.x = x;
        s.y = y;
        var rx, ry;
        if (s.near) {                           // as for near foes
            rx = s.rx + mx - mvx;
            ry = s.ry + my - mvy;
        } else {
            rx = x - shipX;
            ry = y - shipY;
            if (rx < -HALFW) rx += MAPW; else if (rx >= HALFW) rx -= MAPW;
            if (ry < -HALFW) ry += MAPW; else if (ry >= HALFW) ry -= MAPW;
        }
        s.rx = rx;
        s.ry = ry;
        s.near = abs(rx) < NEARX && abs(ry) < NEARY;
        if (s.near && abs(rx) < 5 && abs(ry) < 5 && rx * rx + ry * ry < 25) {
            s.on = 0;
            hitShip();
        }
    }
}

// New enemies come in anywhere on the map out of sight, more often as time
// goes on.
function spawnFoes() {
    // ticks between spawns: 6.6 (5 a second) at first, 0.2 less every 5 s,
    // down to 2; what is left over carries on, so fractions count
    var every = 6.6 - min(playT / 165, 23) * 0.2;
    spawnT += 1.0;
    if (spawnT < every) return;
    spawnT -= every;
    // the cap: 12 alive at first, 1 more every 2 s, up to NFOES
    if (nf >= min(NFOES, 12 + playT / 66)) return;
    var f = foes[nf];
    nf++;
    var rx, ry;
    do {                        // anywhere but on the screen or within 12 px of it
        rx = rnd(480.0) - 240.0;
        ry = rnd(480.0) - 240.0;
    } while (abs(rx) <= 92 && abs(ry) <= 72);
    var x = shipX + rx;
    var y = shipY + ry;
    if (x < 0) x += MAPW; else if (x >= MAPW) x -= MAPW;
    if (y < 0) y += MAPW; else if (y >= MAPW) y -= MAPW;
    f.x = x;
    f.y = y;
    f.rx = rx;
    f.ry = ry;
    f.near = abs(rx) < NEARX && abs(ry) < NEARY ? 1 : 0;   // never in view
    f.slot = nspawned & (SLOW - 1);
    nspawned++;
    f.last = playT;

    var r = rnd(100);
    f.kind = r < 50 ? ROCK : (r < 90 ? STALK : FIGHT);
    f.hp = HP[f.kind];
    f.hr = 1 + RAD[f.kind];     // hit by a shot within this
    f.cr = 4 + RAD[f.kind];     // touches the ship within this
    f.on = 1;
    f.flash = 0;
    f.pt = 0;
    f.ult = 0;
    f.cool = 33;
    f.ang = rnd();
    var h = atan2(-rx, -ry);    // facing the ship
    f.ca = cos(h);
    f.sa = sin(h);
    f.ai = ((h * 16.0 + 0.5) | 0) & 15;
    if (f.kind == ROCK) {
        var d = rnd();          // its drift, for good
        f.vx = cos(d) * SP_ROCK;
        f.vy = sin(d) * SP_ROCK;
        f.shape = rnd(ROCK_SHAPES);
        f.spin = (0.002 + rnd(0.004)) * (rnd(2) == 0 ? -1 : 1);
    }
}

// ---- draw ----

function draw() {
    cls(C_BG);
    var cx = -80;
    var cy = -60;
    if (shake > 0) { cx += rnd(5) - 2; cy += rnd(5) - 2; }
    camera(cx, cy);
    drawStars();

    if (state == 1 || state == 2) {
        drawFoes();
        drawShots();
        if (state == 1) drawShip();
        camera(cx + pox, cy + poy);
        particles.draw(fx);
        camera(cx, cy);
        if (ultK > 0) drawRing();
        if (waveK > 0) circ(0, 0, ULT_R * (WAVE_T + 1 - waveK) / WAVE_T, C_RED);
        camera();
        drawHud();
    } else if (state == 0) {
        camera();
        drawTitle();
    } else {
        camera(cx + pox, cy + poy);
        particles.draw(fx);
        camera();
        drawOver();
    }
}

function drawStars() {
    for (var d = 0; d < 3; d++) {
        var c = STAR_C[d];
        var end = SB[d + 1];
        for (var i = SB[d]; i < end; i++) pset(sx[i], sy[i], c);
    }
}

// An arrowhead pointing along ca, sa (a direction's cos and sin), with a
// notch at the back and a flame.
function arrow(x, y, ca, sa, c, flame) {
    var nx = x - ca * 1.5;      // the notch
    var ny = y - sa * 1.5;
    if (flame > 0) {
        trifill(nx - sa * 1.5, ny + ca * 1.5, nx + sa * 1.5, ny - ca * 1.5,
                nx - ca * flame, ny - sa * flame, C_FLAME);
    }
    var hx = x + ca * 5;
    var hy = y + sa * 5;
    var lx = x + (ca * AC - sa * AS) * 4.5;
    var ly = y + (sa * AC + ca * AS) * 4.5;
    var rx = x + (ca * AC + sa * AS) * 4.5;
    var ry = y + (sa * AC - ca * AS) * 4.5;
    trifill(hx, hy, lx, ly, nx, ny, c);
    trifill(hx, hy, rx, ry, nx, ny, c);
}

function drawShip() {
    if (inv > 0 && ((inv / 3) & 1)) return;
    var flame = 0.0;
    if (speed > 0) flame = 2.0 + speed * 1.5 + rnd(2.0);
    if (flame > 0) {
        var ca = cos(heading);
        var sa = sin(heading);
        var nx = -ca * 1.5;     // the notch at the back
        var ny = -sa * 1.5;
        trifill(nx - sa * 1.5, ny + ca * 1.5, nx + sa * 1.5, ny - ca * 1.5,
                nx - ca * flame, ny - sa * flame, C_FLAME);
    }
    blit(shipImgs[((heading * 32.0 + 0.5) | 0) & 31], -6, -6);
}

function drawFoes() {
    var pulse = ((frame() >> 2) & 1) * 16;      // stalkers pulse
    var flick = frame() & 1;
    for (var v = 0; v < nvis; v++) {
        var f = foes[vis[v]];
        if (!f.on) continue;
        if (f.kind == ROCK) {
            blit(rockImgs[f.shape * ROCK_TURNS + ((f.ang * ROCK_TURNS) | 0)],
                 f.rx - 8, f.ry - 8);
        } else if (f.kind == STALK) {
            spr(pulse + f.ai, f.rx - 4, f.ry - 4);
        } else {
            var c = f.flash > 0 ? 2 : (f.hp > 1 ? 0 : 1);
            blit(fightImgs[c * 16 + f.ai], f.rx - 6, f.ry - 6);
            if (flick) pset(f.rx - f.ca * 4.5, f.ry - f.sa * 4.5, C_FLAME);
        }
    }
}

function drawShots() {
    var i, s;
    for (i = 0; i < NSHOTS; i++) {
        s = shots[i];
        if (s.on) line(s.x, s.y, s.x - s.dx * 0.6, s.y - s.dy * 0.6, C_SHOT);
    }
    for (i = 0; i < NESHOTS; i++) {
        s = eshots[i];
        if (s.on && s.near && abs(s.rx) < 82 && abs(s.ry) < 62)
            circfill(s.rx, s.ry, 1, C_ESHOT);
    }
}

function drawRing() {
    var r = ULT_R * ultK / ULT_GROW;
    var c = C_WHITE;
    if (ultK > 10) {
        c = C_RING3;
        fillp(0x5a5a);
    } else if (ultK > 5) {
        c = C_RING2;
    }
    circ(0, 0, r, c);
    if (r > 2 && ultK <= 10) circ(0, 0, r - 2, c);
    fillp();
}

function heart(x, y) {
    rectfill(x + 1, y, x + 2, y, C_HEART);
    rectfill(x + 4, y, x + 5, y, C_HEART);
    rectfill(x, y + 1, x + 6, y + 2, C_HEART);
    rectfill(x + 1, y + 3, x + 5, y + 3, C_HEART);
    rectfill(x + 2, y + 4, x + 4, y + 4, C_HEART);
    pset(x + 3, y + 5, C_HEART);
}

function drawHud() {
    for (var i = 0; i < hp; i++) spr(32, 2 + i * 8, 2);
    print(ptsStr, 80 - (textw(ptsStr) >> 1), 2, C_WHITE);
    // the ultimate's bar: a third of the screen wide, top right, filling
    // towards the corner
    rect(106, 1, 159, 5, C_RING3);
    if (charge >= ULT_CHARGE && ultK == 0) {
        rectfill(107, 2, 158, 4, ((frame() >> 3) & 1) ? C_DARKRED : C_RED);
    } else {
        var w = 52 * charge / ULT_CHARGE;
        if (w > 0) rectfill(107, 2, 106 + w, 4, C_WHITE);
    }
}

function ctext(s, y, c) {
    print(s, 80 - (textw(s) >> 1), y, c);
}

function drawTitle() {
    font(FONT.CAPS, 2);
    ctext("SPACE SHOOTER", 28, C_WHITE);
    font(FONT.CAPS);
    ctext("TOUCH THE WHEEL TO MOVE", 60, C_CYAN);
    ctext("LIFT YOUR FINGER: ULTIMATE", 70, C_CYAN);
    if ((frame() >> 4) & 1) ctext("SELECT TO START", 88, C_WHITE);
    ctext(bestStr, 104, C_ROCK_EDGE);
}

function drawOver() {
    font(FONT.CAPS, 2);
    ctext("GAME OVER", 30, C_STALK);
    font(FONT.CAPS);
    ctext(overStr, 60, C_WHITE);
    ctext(bestStr, 72, C_ROCK_EDGE);
    if ((frame() >> 4) & 1) ctext("SELECT TO RESTART", 94, C_WHITE);
}
