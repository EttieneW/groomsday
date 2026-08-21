import Phaser from "../phaser";
import { sfx, unlockAudio } from "../audio";
import {
  APEX_GRAVITY,
  APEX_WINDOW,
  COYOTE,
  CROUCH_DISPLAY_H,
  CROUCH_FRAMES,
  DOUBLE_JUMP_VEL,
  ENEMY_RECOVER,
  ENEMY_SHOT_SPEED,
  ENEMY_WINDUP,
  GRAVITY_DOWN,
  GRAVITY_UP,
  GROUND,
  H,
  HERO_DISPLAY_H,
  HERO_DISPLAY_W,
  HERO_FRAME,
  HEROES,
  IDLE_FRAMES,
  INVULN,
  JUMP_BUFFER,
  JUMP_FRAMES,
  JUMP_VEL,
  LEVEL_H,
  LEVEL_W,
  MAX_DT,
  MAX_FALL,
  RUN_FRAMES,
  WEAPONS,
  W,
  type HeroId,
  type WeaponId,
} from "../constants";
import { injectKeys, sampleActions } from "../input";
import { LEVEL } from "../level";
import type { CreateGameOptions, EnemySnap, NetEvent, PlayerSnap, ShotSnap, WorldSnap } from "../types";

type KeyObj = Phaser.Input.Keyboard.Key;

type BulletData = {
  life: number;
  dmg: number;
  owner: "player" | "enemy";
  explode: number;
  pid: string;
  sid?: number;
};

type EnemyObj = {
  id: number;
  kind: "skeleton" | "ghost" | "bat";
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  max: number;
  facing: 1 | -1;
  patrol: number;
  homeX: number;
  shootT: number;
  phase: number;
  alive: boolean;
  mode: "move" | "windup" | "recover";
  modeT: number;
  short: boolean;
};

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("play");
  }

  options!: CreateGameOptions;
  keys: Record<string, KeyObj> = {};
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  prevJump = false;
  prevShoot = false;
  prevPause = false;

  player!: Phaser.Physics.Arcade.Sprite;
  solids!: Phaser.Physics.Arcade.StaticGroup;
  oneWays!: Phaser.Physics.Arcade.StaticGroup;
  movers: {
    sprite: Phaser.Physics.Arcade.Sprite;
    axis: "x" | "y";
    home: number;
    dist: number;
    speed: number;
    sign: number;
  }[] = [];
  bullets!: Phaser.Physics.Arcade.Group;
  enemyShots!: Phaser.Physics.Arcade.Group;
  coins: { id: number; spr: Phaser.Physics.Arcade.Sprite; taken: boolean }[] = [];
  pickups: { id: number; spr: Phaser.Physics.Arcade.Sprite; weapon: WeaponId; taken: boolean }[] = [];
  hazards: Phaser.Physics.Arcade.StaticGroup | null = null;
  enemies: EnemyObj[] = [];
  remotes = new Map<string, Phaser.GameObjects.Sprite>();
  shotIndex = new Map<number, Phaser.Physics.Arcade.Sprite>();
  nextShotId = 1;
  lastRunFrame = -1;

  facing: 1 | -1 = 1;
  coyote = 0;
  buffer = 0;
  jumpsLeft = 2;
  grounded = false;
  dropT = 0;
  invuln = 0;
  fireCd = 0;
  weapon: WeaponId = "pistol";
  ammo = Infinity;
  hp = 4;
  maxHp = 4;
  coinsLocal = 0;
  teamCoins = 0;
  lives = 3;
  checkpoint = { x: LEVEL.spawn.x, y: LEVEL.spawn.y };
  won = false;
  dead = false;
  pauseSim = false;
  hitstop = 0;
  trauma = 0;
  wasGrounded = true;
  spawnProtect = 0.8;
  bannerT = 2.4;
  lastSent = 0;
  lastWorld = 0;
  lastHurt = new Set<number>();
  squashT = 0;
  crouching = false;

  hudHp!: Phaser.GameObjects.Text;
  hudCoins!: Phaser.GameObjects.Text;
  hudGun!: Phaser.GameObjects.Text;
  hudBanner!: Phaser.GameObjects.Text;
  hudHint!: Phaser.GameObjects.Text;

  init() {
    this.movers = [];
    this.coins = [];
    this.pickups = [];
    this.enemies = [];
    this.remotes = new Map();
    this.shotIndex = new Map();
    this.nextShotId = 1;
    this.lastRunFrame = -1;
    this.facing = 1;
    this.coyote = 0;
    this.buffer = 0;
    this.jumpsLeft = 2;
    this.grounded = false;
    this.dropT = 0;
    this.invuln = 0;
    this.fireCd = 0;
    this.weapon = "pistol";
    this.ammo = Infinity;
    this.coinsLocal = 0;
    this.teamCoins = 0;
    this.lives = 3;
    this.checkpoint = { x: LEVEL.spawn.x, y: LEVEL.spawn.y };
    this.won = false;
    this.dead = false;
    this.pauseSim = false;
    this.hitstop = 0;
    this.trauma = 0;
    this.wasGrounded = true;
    this.spawnProtect = 0.8;
    this.bannerT = 2.6;
    this.lastSent = 0;
    this.lastWorld = 0;
    this.prevJump = false;
    this.prevShoot = false;
    this.prevPause = false;
    this.squashT = 0;
    this.crouching = false;
  }

  preload() {
    const bar = this.add.rectangle(W / 2, H / 2, 320, 8, 0x3a2828).setScrollFactor(0);
    const fill = this.add.rectangle(W / 2 - 160, H / 2, 4, 8, 0x8b1e3d).setOrigin(0, 0.5).setScrollFactor(0);
    this.add
      .text(W / 2, H / 2 - 28, "LOADING RAID", {
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "14px",
        color: "#e4d5c0",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.load.on("progress", (v: number) => {
      fill.width = 320 * v;
    });

    this.load.image("sky", "/game/map/sky.jpg");
    this.load.image("mid", "/game/map/mid.jpg");
    this.load.image("plat", "/game/props/platform.png");
    this.load.image("ground", "/game/props/ground.png");
    this.load.image("coffin", "/game/props/coffin.png");
    this.load.image("spike", "/game/props/spikes.png");
    this.load.image("ckpt", "/game/props/checkpoint.png");
    this.load.image("flag", "/game/props/flag.png");
    this.load.image("crate", "/game/props/crate.png");

    const heroes: HeroId[] = ["lens", "goldie", "bear", "stache"];
    for (const h of heroes) {
      this.load.spritesheet(`${h}-idle`, `/game/sprites/${h}-idle.png`, {
        frameWidth: HERO_FRAME,
        frameHeight: HERO_FRAME,
      });
      this.load.spritesheet(`${h}-run`, `/game/sprites/${h}-run.png`, {
        frameWidth: HERO_FRAME,
        frameHeight: HERO_FRAME,
      });
      this.load.spritesheet(`${h}-jump`, `/game/sprites/${h}-jump.png`, {
        frameWidth: HERO_FRAME,
        frameHeight: HERO_FRAME,
      });
      this.load.spritesheet(`${h}-crouch`, `/game/sprites/${h}-crouch.png`, {
        frameWidth: HERO_FRAME,
        frameHeight: HERO_FRAME,
      });
    }
    this.load.spritesheet("skeleton", "/game/sprites/skeleton.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("skeleton-shoot", "/game/sprites/skeleton-shoot.png", {
      frameWidth: HERO_FRAME,
      frameHeight: HERO_FRAME,
    });
    this.load.spritesheet("ghost", "/game/sprites/ghost.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("ghost-shoot", "/game/sprites/ghost-shoot.png", {
      frameWidth: HERO_FRAME,
      frameHeight: HERO_FRAME,
    });
    this.load.spritesheet("bat", "/game/sprites/bat.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("explode", "/game/sprites/explode.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("coin", "/game/sprites/coin.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("bullet", "/game/sprites/bullet.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("enemy-shot", "/game/sprites/enemy-shot.png", {
      frameWidth: HERO_FRAME,
      frameHeight: HERO_FRAME,
    });
    this.load.spritesheet("muzzle", "/game/sprites/muzzle.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
  }

  create() {
    this.options = this.registry.get("options") as CreateGameOptions;
    const hero = this.options.hero;
    const stats = HEROES[hero];
    this.maxHp = stats.hp;
    this.hp = stats.hp;

    unlockAudio();
    this.input.once("pointerdown", () => unlockAudio());

    this.makeAnims();
    this.buildWorld();
    this.spawnPlayer();
    this.spawnPickables();
    this.spawnEnemies();
    this.bindInput();
    this.bindCollisions();
    this.buildHud();
    this.wireControlsTest();
    window.__playScene = this;

    this.cameras.main.setBounds(0, 0, LEVEL_W, LEVEL_H);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.1);
    this.cameras.main.setDeadzone(90, 70);
    this.cameras.main.setFollowOffset(-80, 24);

    this.events.once("shutdown", () => {
      this.movers.length = 0;
      this.coins.length = 0;
      this.pickups.length = 0;
      this.enemies.length = 0;
      this.remotes.clear();
      this.shotIndex.clear();
    });
  }

  makeAnims() {
    const mk = (key: string, tex: string, frames: number, rate: number, repeat: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(tex, { start: 0, end: frames - 1 }),
        frameRate: rate,
        repeat,
      });
    };
    for (const h of ["lens", "goldie", "bear", "stache"] as HeroId[]) {
      mk(`${h}-idle`, `${h}-idle`, IDLE_FRAMES, 7, -1);
      mk(`${h}-run`, `${h}-run`, RUN_FRAMES, 14, -1);
      mk(`${h}-jump`, `${h}-jump`, JUMP_FRAMES, 10, 0);
      mk(`${h}-crouch`, `${h}-crouch`, CROUCH_FRAMES, 8, -1);
    }
    mk("skeleton", "skeleton", 4, 9, -1);
    mk("skeleton-shoot", "skeleton-shoot", 4, 10, 0);
    mk("ghost", "ghost", 4, 7, -1);
    mk("ghost-shoot", "ghost-shoot", 4, 10, 0);
    mk("bat", "bat", 4, 10, -1);
    mk("explode", "explode", 4, 14, 0);
    mk("coin", "coin", 4, 8, -1);
    mk("bullet", "bullet", 4, 12, -1);
    mk("enemy-shot", "enemy-shot", 4, 14, -1);
    mk("muzzle", "muzzle", 4, 18, 0);
  }

  buildWorld() {
    const sky = this.add.image(0, -40, "sky").setOrigin(0, 0).setScrollFactor(0.1, 0).setDepth(-20);
    sky.setDisplaySize(LEVEL_W * 0.42, 460);
    const mid = this.add.image(0, 80, "mid").setOrigin(0, 0).setScrollFactor(0.32, 0).setDepth(-12);
    mid.setDisplaySize(LEVEL_W * 0.55, 420);
    mid.setAlpha(0.55);
    this.add.rectangle(LEVEL_W / 2, 620, LEVEL_W, 280, 0x12090c).setDepth(-8);
    this.add
      .rectangle(LEVEL_W / 2, 500, LEVEL_W, 180, 0x12090c, 0.55)
      .setDepth(-7);

    this.solids = this.physics.add.staticGroup();
    this.oneWays = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    for (const p of LEVEL.platforms) {
      if (p.kind === "moving") {
        const key = p.sprite === "coffin" ? "coffin" : "plat";
        const s = this.physics.add.sprite(p.x + p.w / 2, p.y + p.h / 2, key);
        s.setDisplaySize(p.w, p.h + 8);
        s.setImmovable(true);
        const mb = s.body as Phaser.Physics.Arcade.Body;
        mb.setAllowGravity(false);
        mb.setSize(s.width, s.height * 0.55);
        mb.setOffset(0, s.height * 0.2);
        this.movers.push({
          sprite: s,
          axis: p.axis ?? "x",
          home: p.axis === "y" ? p.y + p.h / 2 : p.x + p.w / 2,
          dist: p.dist ?? 160,
          speed: p.speed ?? 60,
          sign: 1,
        });
        continue;
      }
      const isGround = p.h >= 70;
      const fill = isGround ? 0x2a1612 : 0x3a241c;
      const box = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, fill, 1);
      box.setDepth(1);
      this.physics.add.existing(box, true);
      this.tileStrip(isGround ? "ground" : "plat", p.x, p.y, p.w, p.h, 2, isGround ? 140 : 96);
      if (p.kind === "oneway") this.oneWays.add(box);
      else this.solids.add(box);
    }

    for (const h of LEVEL.hazards) {
      const s = this.physics.add.staticSprite(h.x + h.w / 2, h.y + h.h / 2, "spike");
      s.setDisplaySize(h.w, Math.max(28, h.h));
      s.refreshBody();
      this.hazards.add(s);
    }

    for (const c of LEVEL.checkpoints) {
      this.add.image(c.x, c.y - 10, "ckpt").setOrigin(0.5, 1).setDisplaySize(54, 70).setDepth(2);
    }
    this.add.image(LEVEL.flag.x, LEVEL.flag.y, "flag").setOrigin(0.5, 1).setDisplaySize(70, 110).setDepth(3);
  }

  tileStrip(key: string, x: number, y: number, w: number, h: number, depth: number, tileW: number) {
    const n = Math.max(1, Math.ceil(w / tileW));
    const piece = w / n;
    for (let i = 0; i < n; i++) {
      const img = this.add.image(x + i * piece + piece / 2, y + h / 2, key);
      img.setDisplaySize(piece + 1.2, h);
      img.setDepth(depth);
    }
  }

  spawnPlayer() {
    const hero = this.options.hero;
    const p = this.physics.add.sprite(LEVEL.spawn.x, LEVEL.spawn.y, `${hero}-idle`, 0);
    p.setDisplaySize(HERO_DISPLAY_W, HERO_DISPLAY_H);
    p.setCollideWorldBounds(false);
    p.setDepth(10);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setSize(78, 168);
    body.setOffset((HERO_FRAME - 78) / 2, HERO_FRAME - 176);
    body.setMaxVelocity(620, MAX_FALL);
    body.setAllowGravity(false);
    body.setDrag(0, 0);
    body.setBounce(0);
    if (body.friction) {
      body.friction.x = 0;
      body.friction.y = 0;
    }
    p.play(`${hero}-idle`);
    p.on("animationupdate", (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      if (!anim.key.endsWith("-run") || !this.grounded) return;
      if (frame.index === 0 || frame.index === 3) {
        if (this.lastRunFrame !== frame.index) {
          this.lastRunFrame = frame.index;
          this.puff(p.x, p.y + 52, 3);
        }
      }
    });
    this.player = p;
    this.physics.world.setBounds(0, 0, LEVEL_W, LEVEL_H + 200);
  }

  spawnPickables() {
    LEVEL.coins.forEach((c, i) => {
      const s = this.physics.add.sprite(c.x, c.y, "coin", 0);
      s.setDisplaySize(28, 28);
      s.body?.setAllowGravity(false);
      s.play("coin");
      s.setDepth(6);
      this.coins.push({ id: i, spr: s, taken: false });
    });
    LEVEL.pickups.forEach((p, i) => {
      const s = this.physics.add.sprite(p.x, p.y, "crate", 0);
      s.setDisplaySize(46, 32);
      s.body?.setAllowGravity(false);
      s.setDepth(6);
      this.tweens.add({ targets: s, y: p.y - 6, yoyo: true, duration: 700, repeat: -1, ease: "Sine.easeInOut" });
      this.pickups.push({ id: i, spr: s, weapon: p.weapon, taken: false });
    });

    this.bullets = this.physics.add.group({ maxSize: 72, allowGravity: false });
    this.enemyShots = this.physics.add.group({ maxSize: 48, allowGravity: false });
  }

  spawnEnemies() {
    LEVEL.enemies.forEach((e, i) => {
      const s = this.physics.add.sprite(e.x, e.y, e.kind, 0);
      const short = Boolean(e.short);
      const size = short ? 72 : e.kind === "bat" ? 70 : e.kind === "ghost" ? 86 : 92;
      s.setDisplaySize(size, short ? 48 : e.kind === "bat" ? 52 : e.kind === "ghost" ? 110 : 124);
      s.setDepth(8);
      s.play(e.kind);
      const body = s.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(short ? 110 : e.kind === "bat" ? 120 : 100, short ? 72 : e.kind === "bat" ? 90 : 160);
      body.setOffset(
        (HERO_FRAME - (short ? 110 : e.kind === "bat" ? 120 : 100)) / 2,
        HERO_FRAME - (short ? 80 : e.kind === "bat" ? 140 : 170),
      );
      const hp = e.kind === "skeleton" ? (short ? 2 : 3) : e.kind === "ghost" ? 2 : 1;
      this.enemies.push({
        id: i,
        kind: e.kind,
        sprite: s,
        hp,
        max: hp,
        facing: 1,
        patrol: e.patrol ?? 80,
        homeX: e.x,
        shootT: 0.5 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        alive: true,
        mode: "move",
        modeT: 0,
        short,
      });
    });
  }

  bindInput() {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    const add = (name: string, code: number | string) => {
      const k = this.input.keyboard!.addKey(code);
      this.keys[name] = k;
    };
    add("A", Phaser.Input.Keyboard.KeyCodes.A);
    add("D", Phaser.Input.Keyboard.KeyCodes.D);
    add("W", Phaser.Input.Keyboard.KeyCodes.W);
    add("S", Phaser.Input.Keyboard.KeyCodes.S);
    add("C", Phaser.Input.Keyboard.KeyCodes.C);
    add("J", Phaser.Input.Keyboard.KeyCodes.J);
    add("K", Phaser.Input.Keyboard.KeyCodes.K);
    add("F", Phaser.Input.Keyboard.KeyCodes.F);
    add("P", Phaser.Input.Keyboard.KeyCodes.P);
    add("ESC", Phaser.Input.Keyboard.KeyCodes.ESC);
    add("SPACE", Phaser.Input.Keyboard.KeyCodes.SPACE);
    add("SHIFT", Phaser.Input.Keyboard.KeyCodes.SHIFT);
    add("CTRL", Phaser.Input.Keyboard.KeyCodes.CTRL);
    add("LEFT", Phaser.Input.Keyboard.KeyCodes.LEFT);
    add("RIGHT", Phaser.Input.Keyboard.KeyCodes.RIGHT);
    add("UP", Phaser.Input.Keyboard.KeyCodes.UP);
    add("R", Phaser.Input.Keyboard.KeyCodes.R);
    this.input.keyboard.on("keydown-R", () => {
      if (this.dead || this.won) this.respawn();
    });
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      this.prevJump = this.prevShoot = true;
    });
  }

  bindCollisions() {
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(
      this.player,
      this.oneWays,
      undefined,
      (player, platObj) => {
        const b = (player as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
        const pb = (platObj as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
        if (this.dropT > 0) return false;
        return b.velocity.y >= 0 && b.bottom <= pb.top + 18;
      },
    );
    for (const m of this.movers) {
      this.physics.add.collider(this.player, m.sprite, undefined, () => {
        const b = this.player.body as Phaser.Physics.Arcade.Body;
        return b.velocity.y >= -20;
      });
    }
    this.physics.add.overlap(this.player, this.hazards!, () => this.hurt(1, true));

    for (const c of this.coins) {
      this.physics.add.overlap(this.player, c.spr, () => this.takeCoin(c.id));
    }
    for (const p of this.pickups) {
      this.physics.add.overlap(this.player, p.spr, () => this.takePickup(p.id));
    }
  }

  buildHud() {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Share Tech Mono, Courier New, monospace",
      fontSize: "18px",
      color: "#e4d5c0",
      stroke: "#10080c",
      strokeThickness: 4,
    };
    this.hudHp = this.add.text(24, 16, "", style).setScrollFactor(0).setDepth(50);
    this.hudCoins = this.add.text(W / 2, 16, "", { ...style, fontSize: "20px" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(50);
    this.hudGun = this.add.text(W - 24, 16, "", { ...style, align: "right" }).setOrigin(1, 0).setScrollFactor(0).setDepth(50);
    this.hudBanner = this.add
      .text(W / 2, 110, "MISSION 1\nCHAPEL OF THE DAMNED", {
        fontFamily: "Alfa Slab One, serif",
        fontSize: "42px",
        color: "#e4d5c0",
        align: "center",
        stroke: "#10080c",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);
    this.hudHint = this.add
      .text(W / 2, H - 18, "A/D move   W/SPACE jump   S crouch (S+jump drop)   J/K fire", {
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "13px",
        color: "#a89486",
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(50);
    this.refreshHud();
  }

  refreshHud() {
    this.hudHp.setText(`${HEROES[this.options.hero].name}   ${this.hp}/${this.maxHp}`);
    this.hudCoins.setText(`RINGS  ${this.teamCoins + this.coinsLocal}`);
    const gun = WEAPONS[this.weapon];
    const ammo = gun.ammo === Infinity ? "∞" : String(Math.max(0, Math.floor(this.ammo)));
    this.hudGun.setText(`${gun.label}  ${ammo}`);
    this.options.callbacks.onHud({
      hp: this.hp,
      maxHp: this.maxHp,
      coins: this.coinsLocal,
      teamCoins: this.teamCoins + this.coinsLocal,
      weapon: this.weapon,
      ammo: this.ammo,
      lives: this.lives,
      banner: this.won ? "win" : this.dead ? "dead" : "play",
    });
  }

  wireControlsTest() {
    const scene = this;
    window.__controlsTest = {
      getYaw: () => (scene.facing === -1 ? 0.4 : -0.4),
      getSpeed: () => Math.abs((scene.player.body as Phaser.Physics.Arcade.Body)?.velocity.x ?? 0),
      getX: () => scene.player?.x ?? 0,
      getY: () => scene.player?.y ?? 0,
      setKeys: (codes: string[]) => injectKeys(codes),
    };
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, MAX_DT);
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      this.hudBanner.setAlpha(Math.min(1, this.bannerT));
      if (this.bannerT <= 0) this.hudBanner.setVisible(false);
    }
    if (this.pauseSim) return;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.applyShake(dt);
      return;
    }

    this.dropT = Math.max(0, this.dropT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.spawnProtect = Math.max(0, this.spawnProtect - dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.squashT = Math.max(0, this.squashT - dt);

    const actions = sampleActions(this);

    if (!this.dead && !this.won) this.controlPlayer(actions, dt);
    this.stepMovers(dt);
    if (this.options.net.isHost) this.stepEnemies(dt);
    else {
      this.applyWorld();
      for (const e of this.enemies) {
        if (!e.alive) continue;
        this.hitEnemyWithBullets(e);
        if (e.kind !== "skeleton" && this.physics.world.overlap(this.player, e.sprite)) this.hurt(1);
      }
    }
    this.stepBullets(dt);
    this.syncRemotes();
    this.applyShake(dt);
    this.checkFlag();
    this.checkCheckpoints();
    this.checkPit();
    this.netTick(_time);

    if (this.player.x > 400) this.hudHint.setAlpha(Math.max(0, this.hudHint.alpha - dt * 0.4));
  }

  controlPlayer(actions: ReturnType<typeof sampleActions>, dt: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const stats = HEROES[this.options.hero];
    const blockedDown = body.blocked.down || body.touching.down;
    this.grounded = blockedDown;
    if (this.grounded) {
      this.coyote = COYOTE;
      this.jumpsLeft = 2;
      if (!this.wasGrounded) {
        sfx.land();
        this.puff(this.player.x, this.player.y + 54, 8);
        this.punchScale(1.16, 0.82, 90);
      }
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }
    this.wasGrounded = this.grounded;

    const dropJump = actions.down && actions.jumpPressed && this.grounded;
    if (dropJump) {
      this.dropT = 0.28;
      this.buffer = 0;
    } else if (actions.jumpPressed) {
      this.buffer = JUMP_BUFFER;
    } else {
      this.buffer = Math.max(0, this.buffer - dt);
    }

    this.crouching = this.grounded && actions.down && this.dropT <= 0 && !dropJump;
    this.applyHeroBox();

    if (!dropJump && this.buffer > 0 && (this.grounded || this.coyote > 0 || this.jumpsLeft > 0)) {
      const fromGround = this.grounded || this.coyote > 0;
      if (fromGround) {
        body.velocity.y = JUMP_VEL * stats.jump;
        this.jumpsLeft = 1;
        sfx.jump();
        this.punchScale(0.86, 1.18, 110);
      } else if (this.jumpsLeft > 0) {
        body.velocity.y = DOUBLE_JUMP_VEL * stats.jump;
        this.jumpsLeft = 0;
        sfx.double();
        this.punchScale(0.9, 1.12, 90);
        this.puff(this.player.x, this.player.y + 20, 5);
      }
      this.buffer = 0;
      this.coyote = 0;
      this.grounded = false;
      this.crouching = false;
      this.applyHeroBox();
    }
    if (!actions.jumpHeld && body.velocity.y < 0) {
      body.velocity.y *= 0.48;
    }

    let g = GRAVITY_DOWN;
    if (body.velocity.y < 0) g = GRAVITY_UP;
    if (Math.abs(body.velocity.y) < APEX_WINDOW) g = APEX_GRAVITY;
    body.velocity.y = Math.min(MAX_FALL, body.velocity.y + g * dt);

    const max = this.crouching ? stats.speed * 0.38 : stats.speed;
    if (actions.moveX !== 0) {
      if (this.grounded) body.setVelocityX(actions.moveX * max);
      else {
        const next = body.velocity.x + actions.moveX * 2400 * dt;
        body.setVelocityX(Phaser.Math.Clamp(next, -max, max));
      }
      this.facing = actions.moveX > 0 ? 1 : -1;
    } else if (this.grounded) {
      body.setVelocityX(0);
    } else {
      body.setVelocityX(body.velocity.x * Math.max(0, 1 - 1.8 * dt));
    }

    this.player.setFlipX(this.facing < 0);
    this.cameras.main.setFollowOffset(-this.facing * 110, 20);

    const hero = this.options.hero;
    if (this.crouching) {
      const want = `${hero}-crouch`;
      if (this.player.anims.currentAnim?.key !== want) this.player.play(want, true);
      this.player.setDisplaySize(HERO_DISPLAY_W, CROUCH_DISPLAY_H);
    } else {
      if (Math.abs(this.player.displayHeight - CROUCH_DISPLAY_H) < 2) {
        this.player.setDisplaySize(HERO_DISPLAY_W, HERO_DISPLAY_H);
      }
      if (!this.grounded) {
        const want = `${hero}-jump`;
        if (this.player.anims.currentAnim?.key !== want) this.player.play(want, true);
      } else if (Math.abs(body.velocity.x) > 40) {
        const want = `${hero}-run`;
        if (this.player.anims.currentAnim?.key !== want) this.player.play(want, true);
      } else if (this.player.anims.currentAnim?.key !== `${hero}-idle`) {
        this.player.play(`${hero}-idle`, true);
        this.lastRunFrame = -1;
      }
    }

    if (this.invuln > 0) this.player.setAlpha(0.45 + 0.55 * Math.sin(this.invuln * 28));
    else this.player.setAlpha(1);

    const wantShoot = actions.shootHeld || actions.shootPressed;
    if (wantShoot && this.fireCd <= 0) this.fire();
  }

  fire() {
    const gun = WEAPONS[this.weapon];
    const stats = HEROES[this.options.hero];
    this.fireCd = gun.cooldown / stats.fire;
    if (gun.ammo !== Infinity) {
      this.ammo -= 1;
      if (this.ammo <= 0) {
        this.weapon = "pistol";
        this.ammo = Infinity;
      }
    }
    sfx.shoot(gun.id);
    this.trauma = Math.min(1, this.trauma + (gun.id === "rocket" ? 0.35 : gun.id === "shotgun" ? 0.22 : 0.08));
    this.punchScale(0.92, 1.06, 70);
    const originX = this.player.x + this.facing * (this.crouching ? 40 : 34);
    const originY = this.player.y + (this.crouching ? 28 : -10);
    this.flashMuzzle(originX, originY, this.facing);
    for (let i = 0; i < gun.count; i++) {
      const spr = this.bullets.get(originX, originY, "bullet") as Phaser.Physics.Arcade.Sprite | null;
      if (!spr) continue;
      spr.setActive(true).setVisible(true);
      spr.setDisplaySize(gun.id === "rocket" ? 28 : 16, gun.id === "rocket" ? 16 : 10);
      spr.clearTint();
      const body = spr.body as Phaser.Physics.Arcade.Body;
      body.enable = true;
      body.setAllowGravity(false);
      const spread = (Math.random() - 0.5) * gun.spread + (i - (gun.count - 1) / 2) * (gun.spread * 0.6);
      const vx = Math.cos(spread) * gun.speed * this.facing;
      const vy = Math.sin(spread) * gun.speed;
      spr.setVelocity(vx, vy);
      spr.setFlipX(this.facing < 0);
      spr.play("bullet", true);
      (spr as Phaser.Physics.Arcade.Sprite & { dat?: BulletData }).dat = {
        life: gun.life,
        dmg: gun.damage,
        owner: "player",
        explode: gun.explode,
        pid: this.options.net.selfId,
      };
    }
    this.refreshHud();
  }

  stepMovers(dt: number) {
    for (const m of this.movers) {
      const body = m.sprite.body as Phaser.Physics.Arcade.Body;
      if (m.axis === "x") {
        if (Math.abs(m.sprite.x - m.home) > m.dist) m.sign *= -1;
        body.setVelocity(m.speed * m.sign, 0);
      } else {
        if (Math.abs(m.sprite.y - m.home) > m.dist) m.sign *= -1;
        body.setVelocity(0, m.speed * m.sign);
      }
    }
  }

  stepEnemies(dt: number) {
    const px = this.player.x;
    const py = this.player.y;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const s = e.sprite;
      const body = s.body as Phaser.Physics.Arcade.Body;
      e.phase += dt;
      e.shootT -= dt;
      e.modeT = Math.max(0, e.modeT - dt);

      if (e.mode === "windup") {
        body.setVelocity(0, 0);
        s.setTint(0xffe6a8);
        if (e.modeT <= 0) {
          const dir = Math.sign(px - s.x) || e.facing;
          e.facing = dir >= 0 ? 1 : -1;
          s.setFlipX(e.facing < 0);
          this.flashMuzzle(s.x + e.facing * 28, s.y - 18, e.facing);
          if (e.kind === "ghost") {
            this.enemyShoot(s.x + e.facing * 22, s.y - 8, e.facing * 150, (py - s.y) * 0.35);
          } else {
            this.enemyShoot(s.x + e.facing * 26, s.y - 16, e.facing * ENEMY_SHOT_SPEED, 0);
          }
          sfx.enemyShot();
          e.mode = "recover";
          e.modeT = ENEMY_RECOVER;
          s.clearTint();
        }
        this.hitEnemyWithBullets(e);
        continue;
      }

      if (e.mode === "recover") {
        if (e.modeT <= 0) {
          e.mode = "move";
          if (this.anims.exists(e.kind)) s.play(e.kind, true);
        }
        this.hitEnemyWithBullets(e);
        continue;
      }

      if (e.kind === "skeleton") {
        if (Math.abs(s.x - e.homeX) > e.patrol) e.facing *= -1;
        body.setVelocity(55 * e.facing, 0);
        s.setFlipX(e.facing < 0);
        if (s.anims.currentAnim?.key !== "skeleton") s.play("skeleton", true);
        if (!e.short && e.shootT <= 0 && Math.abs(s.x - px) < 460 && Math.abs(s.y - py) < 140) {
          this.beginWindup(e, px);
        }
      } else if (e.kind === "ghost") {
        const dx = px - s.x;
        const dy = py - 30 - s.y;
        e.facing = dx >= 0 ? 1 : -1;
        body.setVelocity(Math.sign(dx) * 40, Math.sin(e.phase * 2) * 30 + Math.sign(dy) * 22);
        s.setFlipX(e.facing < 0);
        if (s.anims.currentAnim?.key !== "ghost") s.play("ghost", true);
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
        if (e.shootT <= 0 && Math.abs(s.x - px) < 380) this.beginWindup(e, px);
      } else {
        body.setVelocity(Math.sin(e.phase * 1.4) * 90, Math.cos(e.phase * 2.1) * 50);
        s.setFlipX(body.velocity.x < 0);
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
      }
      this.hitEnemyWithBullets(e);
    }
  }

  beginWindup(e: EnemyObj, px: number) {
    e.mode = "windup";
    e.modeT = ENEMY_WINDUP;
    e.shootT = e.kind === "ghost" ? 2.2 : 1.7 + Math.random() * 0.7;
    e.facing = px >= e.sprite.x ? 1 : -1;
    e.sprite.setFlipX(e.facing < 0);
    const key = e.kind === "ghost" ? "ghost-shoot" : "skeleton-shoot";
    if (this.anims.exists(key)) e.sprite.play(key, true);
    e.sprite.setTint(0xffe6a8);
    sfx.windup();
    this.flashMuzzle(e.sprite.x + e.facing * 20, e.sprite.y - 22, e.facing, true);
  }

  hitEnemyWithBullets(e: EnemyObj) {
    for (const child of this.bullets.getChildren()) {
      const bullet = child as Phaser.Physics.Arcade.Sprite & { dat?: BulletData };
      if (!bullet.active || !bullet.dat || bullet.dat.owner !== "player") continue;
      if (!this.physics.world.overlap(bullet, e.sprite)) continue;
      if (this.options.net.isHost) {
        this.damageEnemy(e, bullet.dat.dmg, bullet.x, bullet.y, bullet.dat.explode);
      } else {
        this.options.net.sendEvent({ t: "hit", id: e.id, dmg: bullet.dat.dmg });
      }
      this.killBullet(bullet);
    }
  }

  applyWorld() {
    const w = this.options.net.world;
    if (!w) return;
    for (const snap of w.enemies) {
      const e = this.enemies[snap.id];
      if (!e) continue;
      if (!snap.alive) {
        if (e.alive) this.killEnemy(e, false);
        continue;
      }
      e.sprite.x = Phaser.Math.Linear(e.sprite.x, snap.x, 0.35);
      e.sprite.y = Phaser.Math.Linear(e.sprite.y, snap.y, 0.35);
      e.sprite.setFlipX(snap.facing < 0);
      if (snap.windup) e.sprite.setTint(0xffe6a8);
      else e.sprite.clearTint();
      if (snap.anim && e.sprite.anims.currentAnim?.key !== snap.anim) {
        try {
          e.sprite.play(snap.anim, true);
        } catch {
          /* missing */
        }
      }
    }
    const seen = new Set<number>();
    for (const shot of w.shots) {
      seen.add(shot.id);
      this.ensureEnemyShot(shot);
    }
    for (const [id, spr] of this.shotIndex) {
      if (!seen.has(id)) {
        this.killBullet(spr);
        this.shotIndex.delete(id);
      }
    }
    for (const id of w.coinsTaken) this.takeCoin(id, true);
    for (const id of w.pickupsTaken) {
      const p = this.pickups[id];
      if (p && !p.taken) {
        p.taken = true;
        p.spr.setVisible(false);
        p.spr.body && ((p.spr.body as Phaser.Physics.Arcade.Body).enable = false);
      }
    }
    this.teamCoins = w.teamCoins;
    if (w.won && !this.won) this.triggerWin();
  }

  ensureEnemyShot(snap: ShotSnap) {
    let spr = this.shotIndex.get(snap.id);
    if (!spr || !spr.active) {
      const spawned = this.spawnEnemyShotSprite(snap.x, snap.y, snap.vx, snap.vy, snap.id, snap.life);
      if (!spawned) return;
      spr = spawned;
    } else {
      spr.x = Phaser.Math.Linear(spr.x, snap.x, 0.45);
      spr.y = Phaser.Math.Linear(spr.y, snap.y, 0.45);
      spr.setVelocity(snap.vx, snap.vy);
    }
  }

  enemyShoot(x: number, y: number, vx: number, vy: number) {
    const id = this.nextShotId++;
    this.spawnEnemyShotSprite(x, y, vx, vy, id, 1.8);
    this.options.net.sendEvent({ t: "eshot", id, x, y, vx, vy });
  }

  spawnEnemyShotSprite(x: number, y: number, vx: number, vy: number, id: number, life: number) {
    const spr = this.enemyShots.get(x, y, "enemy-shot") as Phaser.Physics.Arcade.Sprite | null;
    if (!spr) return null;
    spr.setActive(true).setVisible(true);
    spr.setDisplaySize(36, 22);
    spr.clearTint();
    const body = spr.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setSize(90, 70);
    body.setOffset((HERO_FRAME - 90) / 2, (HERO_FRAME - 70) / 2);
    spr.setVelocity(vx, vy);
    spr.setFlipX(vx < 0);
    spr.play("enemy-shot", true);
    (spr as Phaser.Physics.Arcade.Sprite & { dat?: BulletData }).dat = {
      life,
      dmg: 1,
      owner: "enemy",
      explode: 0,
      pid: "e",
      sid: id,
    };
    this.shotIndex.set(id, spr);
    return spr;
  }

  stepBullets(dt: number) {
    const stepGroup = (g: Phaser.Physics.Arcade.Group) => {
      for (const child of g.getChildren()) {
        const s = child as Phaser.Physics.Arcade.Sprite & { dat?: BulletData };
        if (!s.active || !s.dat) continue;
        s.dat.life -= dt;
        if (s.dat.life <= 0 || s.x < this.cameras.main.scrollX - 40 || s.x > this.cameras.main.scrollX + W + 40) {
          if (s.dat.sid != null) this.shotIndex.delete(s.dat.sid);
          this.killBullet(s);
          continue;
        }
        if (s.dat.owner === "enemy" && this.physics.overlap(this.player, s)) {
          this.hurt(s.dat.dmg);
          if (s.dat.sid != null) this.shotIndex.delete(s.dat.sid);
          this.killBullet(s);
        }
      }
    };
    stepGroup(this.bullets);
    stepGroup(this.enemyShots);
  }

  killBullet(s: Phaser.Physics.Arcade.Sprite) {
    s.setActive(false).setVisible(false);
    const body = s.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.stop();
      body.enable = false;
    }
  }

  damageEnemy(e: EnemyObj, dmg: number, x: number, y: number, explode: number) {
    if (!e.alive) return;
    e.hp -= dmg;
    this.hitstop = 0.04;
    this.trauma = Math.min(1, this.trauma + 0.18);
    sfx.hit();
    e.sprite.setTintFill(0xffffff);
    this.time.delayedCall(50, () => e.sprite.clearTint());
    if (explode > 0) this.boom(x, y, explode);
    if (e.hp <= 0) this.killEnemy(e, true);
  }

  killEnemy(e: EnemyObj, juice: boolean) {
    e.alive = false;
    e.sprite.setActive(false).setVisible(false);
    (e.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    if (juice) {
      this.boom(e.sprite.x, e.sprite.y, 40);
      sfx.explode();
    }
  }

  boom(x: number, y: number, radius: number) {
    const fx = this.add.sprite(x, y, "explode", 0).setDisplaySize(72, 72).setDepth(20);
    fx.play("explode");
    fx.once("animationcomplete", () => fx.destroy());
    this.cameras.main.shake(120, 0.006);
    this.puff(x, y, 10);
    if (radius > 50) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y) < radius) {
          this.damageEnemy(e, 2, e.sprite.x, e.sprite.y, 0);
        }
      }
    }
  }

  takeCoin(id: number, silent = false) {
    const c = this.coins[id];
    if (!c || c.taken) return;
    c.taken = true;
    c.spr.setVisible(false);
    (c.spr.body as Phaser.Physics.Arcade.Body).enable = false;
    if (!silent) {
      this.coinsLocal += 1;
      this.teamCoins += 0;
      sfx.coin();
      this.options.net.sendEvent({ t: "coin", id });
      this.refreshHud();
    }
  }

  takePickup(id: number) {
    const p = this.pickups[id];
    if (!p || p.taken) return;
    p.taken = true;
    p.spr.setVisible(false);
    (p.spr.body as Phaser.Physics.Arcade.Body).enable = false;
    this.weapon = p.weapon;
    this.ammo = WEAPONS[p.weapon].ammo;
    sfx.pickup();
    this.flashBanner(WEAPONS[p.weapon].label);
    this.options.net.sendEvent({ t: "pickup", id, weapon: p.weapon });
    this.refreshHud();
  }

  hurt(amount: number, lethal = false) {
    if (this.dead || this.won || this.invuln > 0 || this.spawnProtect > 0) return;
    this.hp -= amount;
    this.invuln = INVULN;
    this.trauma = Math.min(1, this.trauma + 0.45);
    sfx.hurt();
    this.player.setTint(0x8b1e3d);
    this.time.delayedCall(120, () => this.player.clearTint());
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = -this.facing * 180;
    body.velocity.y = -220;
    this.refreshHud();
    this.options.net.sendEvent({ t: "hurt", id: this.options.net.selfId, hp: this.hp });
    if (this.hp <= 0 || lethal) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.lives -= 1;
    this.player.setTint(0x442222);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, -120);
    this.boom(this.player.x, this.player.y, 30);
    this.options.callbacks.onDeath();
    this.time.delayedCall(900, () => this.respawn());
  }

  respawn() {
    this.dead = false;
    this.hp = this.maxHp;
    this.invuln = 1.4;
    this.spawnProtect = 1.2;
    this.weapon = "pistol";
    this.ammo = Infinity;
    this.player.clearTint();
    this.player.setPosition(this.checkpoint.x, this.checkpoint.y - 20);
    (this.player.body as Phaser.Physics.Arcade.Body).stop();
    this.player.setAlpha(1);
    this.player.setDisplaySize(HERO_DISPLAY_W, HERO_DISPLAY_H);
    this.refreshHud();
  }

  checkCheckpoints() {
    for (const c of LEVEL.checkpoints) {
      if (c.x <= this.checkpoint.x + 10) continue;
      if (Math.abs(this.player.x - c.x) < 40 && Math.abs(this.player.y - c.y) < 90) {
        this.checkpoint = { x: c.x, y: c.y - 80 };
        sfx.checkpoint();
        this.flashBanner(`CHECKPOINT — ${c.label.toUpperCase()}`);
        this.options.callbacks.onCheckpoint(c.label);
        this.options.net.sendEvent({ t: "ck", x: c.x });
      }
    }
  }

  checkFlag() {
    if (this.won) return;
    if (Math.abs(this.player.x - LEVEL.flag.x) < 40 && this.player.y < LEVEL.flag.y + 20 && this.player.y > LEVEL.flag.y - 140) {
      this.triggerWin();
    }
  }

  triggerWin() {
    if (this.won) return;
    this.won = true;
    sfx.win();
    this.flashBanner("MISSION COMPLETE");
    this.options.net.sendEvent({ t: "win" });
    this.options.callbacks.onWin(this.teamCoins + this.coinsLocal);
  }

  checkPit() {
    if (this.player.y > GROUND + 140) this.hurt(99, true);
  }

  flashBanner(text: string) {
    this.hudBanner.setText(text).setVisible(true).setAlpha(1);
    this.bannerT = 1.8;
  }

  applyShake(dt: number) {
    const shake = this.trauma * this.trauma;
    if (shake <= 0.002) return;
    this.cameras.main.shake(40, 0.004 * shake);
  }

  punchScale(sx: number, sy: number, ms: number) {
    if (this.crouching) return;
    this.tweens.killTweensOf(this.player);
    this.player.setDisplaySize(HERO_DISPLAY_W * sx, HERO_DISPLAY_H * sy);
    this.tweens.add({
      targets: this.player,
      displayWidth: HERO_DISPLAY_W,
      displayHeight: HERO_DISPLAY_H,
      duration: ms,
      ease: "Back.easeOut",
    });
  }

  applyHeroBox() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.crouching) {
      body.setSize(78, 96);
      body.setOffset((HERO_FRAME - 78) / 2, HERO_FRAME - 104);
    } else {
      body.setSize(78, 168);
      body.setOffset((HERO_FRAME - 78) / 2, HERO_FRAME - 176);
    }
  }

  puff(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const d = this.add.rectangle(x, y, 3 + Math.random() * 4, 3 + Math.random() * 3, 0xc9b49a, 0.85);
      d.setDepth(7);
      this.tweens.add({
        targets: d,
        x: x + (Math.random() - 0.5) * 46,
        y: y - 8 - Math.random() * 22,
        alpha: 0,
        duration: 220 + Math.random() * 140,
        onComplete: () => d.destroy(),
      });
    }
  }

  flashMuzzle(x: number, y: number, dir: number, warn = false) {
    const fx = this.add.sprite(x, y, "muzzle", warn ? 0 : 1).setDepth(16);
    fx.setDisplaySize(warn ? 28 : 42, warn ? 20 : 28);
    fx.setFlipX(dir < 0);
    fx.play("muzzle");
    fx.once("animationcomplete", () => fx.destroy());
  }

  syncRemotes() {
    const net = this.options.net;
    for (const [id, snap] of net.remotes) {
      if (id === net.selfId) continue;
      let spr = this.remotes.get(id);
      if (!spr) {
        spr = this.add.sprite(snap.x, snap.y, `${snap.hero}-idle`, 0);
        spr.setDisplaySize(HERO_DISPLAY_W, HERO_DISPLAY_H);
        spr.setDepth(9);
        spr.setAlpha(0.95);
        spr.play(`${snap.hero}-idle`);
        this.remotes.set(id, spr);
      }
      spr.x = Phaser.Math.Linear(spr.x, snap.x, 0.4);
      spr.y = Phaser.Math.Linear(spr.y, snap.y, 0.4);
      spr.setFlipX(snap.facing < 0);
      if (snap.anim.endsWith("-crouch")) spr.setDisplaySize(HERO_DISPLAY_W, CROUCH_DISPLAY_H);
      else if (spr.displayHeight !== HERO_DISPLAY_H) spr.setDisplaySize(HERO_DISPLAY_W, HERO_DISPLAY_H);
      if (spr.anims.currentAnim?.key !== snap.anim) {
        try {
          spr.play(snap.anim, true);
        } catch {
          /* missing */
        }
      }
      spr.setAlpha(snap.alive ? 1 : 0.35);
    }
    for (const [id, spr] of this.remotes) {
      if (!net.remotes.has(id)) {
        spr.destroy();
        this.remotes.delete(id);
      }
    }
  }

  netTick(now: number) {
    const net = this.options.net;
    if (now - this.lastSent > 50) {
      this.lastSent = now;
      const hero = this.options.hero;
      const anim = this.player.anims.currentAnim?.key ?? `${hero}-idle`;
      const snap: PlayerSnap = {
        id: net.selfId,
        hero,
        name: net.name,
        x: this.player.x,
        y: this.player.y,
        vx: (this.player.body as Phaser.Physics.Arcade.Body).velocity.x,
        vy: (this.player.body as Phaser.Physics.Arcade.Body).velocity.y,
        facing: this.facing,
        anim,
        hp: this.hp,
        maxHp: this.maxHp,
        weapon: this.weapon,
        ammo: this.ammo,
        coins: this.coinsLocal,
        alive: !this.dead,
        invuln: this.invuln,
      };
      net.sendState(snap);
    }
    if (net.isHost && now - this.lastWorld > 80) {
      this.lastWorld = now;
      const shots: ShotSnap[] = [];
      for (const child of this.enemyShots.getChildren()) {
        const s = child as Phaser.Physics.Arcade.Sprite & { dat?: BulletData };
        if (!s.active || !s.dat || s.dat.owner !== "enemy" || s.dat.sid == null) continue;
        shots.push({
          id: s.dat.sid,
          x: s.x,
          y: s.y,
          vx: (s.body as Phaser.Physics.Arcade.Body).velocity.x,
          vy: (s.body as Phaser.Physics.Arcade.Body).velocity.y,
          life: s.dat.life,
        });
      }
      const world: WorldSnap = {
        t: now,
        enemies: this.enemies.map(
          (e): EnemySnap => ({
            id: e.id,
            kind: e.kind,
            x: e.sprite.x,
            y: e.sprite.y,
            vx: (e.sprite.body as Phaser.Physics.Arcade.Body).velocity.x,
            vy: (e.sprite.body as Phaser.Physics.Arcade.Body).velocity.y,
            facing: e.facing,
            hp: e.hp,
            alive: e.alive,
            anim: e.sprite.anims.currentAnim?.key ?? e.kind,
            windup: e.mode === "windup",
          }),
        ),
        shots,
        coinsTaken: this.coins.filter((c) => c.taken).map((c) => c.id),
        pickupsTaken: this.pickups.filter((p) => p.taken).map((p) => p.id),
        checkpointX: this.checkpoint.x,
        teamCoins: this.coinsLocal + [...net.remotes.values()].reduce((a, p) => a + p.coins, 0),
        won: this.won,
      };
      net.sendWorld(world);
    }
  }

  ingestEvent(ev: NetEvent) {
    if (ev.t === "hit" && this.options.net.isHost) {
      const e = this.enemies[ev.id];
      if (e) this.damageEnemy(e, ev.dmg, e.sprite.x, e.sprite.y, 0);
    }
    if (ev.t === "coin") this.takeCoin(ev.id, true);
    if (ev.t === "pickup") {
      const p = this.pickups[ev.id];
      if (p && !p.taken) {
        p.taken = true;
        p.spr.setVisible(false);
      }
    }
    if (ev.t === "win") this.triggerWin();
    if (ev.t === "ck") {
      if (ev.x > this.checkpoint.x) this.checkpoint = { x: ev.x, y: GROUND - 80 };
    }
    if (ev.t === "eshot" && !this.options.net.isHost) {
      if (!this.shotIndex.has(ev.id)) {
        this.spawnEnemyShotSprite(ev.x, ev.y, ev.vx, ev.vy, ev.id, 1.8);
      }
    }
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys?: (codes: string[]) => void;
    };
    __playScene?: PlayScene;
  }
}
