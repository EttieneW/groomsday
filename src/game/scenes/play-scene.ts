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
  FRAG,
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
  KNIFE,
  LEVEL_H,
  LEVEL_W,
  MAX_DT,
  MAX_FALL,
  RUN_FRAMES,
  WEAPONS,
  W,
  type EnemyKind,
  type HeroId,
  type WeaponId,
} from "../constants";
import { extraHp, gunneryMul, speedMul, dmgMul, type UpgradeStacks, emptyUpgrades } from "../campaign";
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
  pierce?: boolean;
  hit?: Set<number>;
  kind?: string;
};

type EnemyObj = {
  id: number;
  kind: EnemyKind;
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
  armored?: boolean;
  faceT: number;
};

type PowObj = { id: number; spr: Phaser.Physics.Arcade.Sprite; taken: boolean; drop: "grenade" | "rings" };
type BreakObj = { id: number; spr: Phaser.Physics.Arcade.Sprite; hp: number; taken: boolean; drop?: "rings" | "grenade" };

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("play");
  }

  options!: CreateGameOptions;
  keys: Record<string, KeyObj> = {};
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  prevJump = false;
  prevShoot = false;
  prevKnife = false;
  prevGrenade = false;
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
  pows: PowObj[] = [];
  breaks: BreakObj[] = [];
  hazards: Phaser.Physics.Arcade.StaticGroup | null = null;
  enemies: EnemyObj[] = [];
  boss: {
    spr: Phaser.Physics.Arcade.Sprite;
    hp: number;
    max: number;
    phase: 1 | 2 | 3;
    t: number;
    alive: boolean;
    locked: boolean;
  } | null = null;
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
  knifeCd = 0;
  grenadeCd = 0;
  weapon: WeaponId = "pistol";
  ammo = Infinity;
  grenades = FRAG.start;
  hp = 4;
  maxHp = 4;
  upgrades: UpgradeStacks = emptyUpgrades();
  guests = 0;
  guestMax = 0;
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
    this.pows = [];
    this.breaks = [];
    this.enemies = [];
    this.boss = null;
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
    this.knifeCd = 0;
    this.grenadeCd = 0;
    this.weapon = "pistol";
    this.ammo = Infinity;
    this.grenades = FRAG.start;
    this.coinsLocal = 0;
    this.teamCoins = 0;
    this.guests = 0;
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
    this.prevKnife = false;
    this.prevGrenade = false;
    this.prevPause = false;
    this.squashT = 0;
    this.crouching = false;
  }

  preload() {
    const bar = this.add.rectangle(W / 2, H / 2, 320, 8, 0x3a2828).setScrollFactor(0);
    const fill = this.add.rectangle(W / 2 - 160, H / 2, 4, 8, 0x8b1e3d).setOrigin(0, 0.5).setScrollFactor(0);
    const loadLabel = this.add
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
    this.load.once("complete", () => {
      loadLabel.destroy();
      bar.destroy();
      fill.destroy();
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
    this.load.spritesheet("laser", "/game/sprites/laser.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("rocket", "/game/sprites/rocket.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("grenade", "/game/sprites/grenade.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.spritesheet("slash", "/game/sprites/slash.png", { frameWidth: HERO_FRAME, frameHeight: HERO_FRAME });
    this.load.image("lychwing", "/game/sprites/lychwing.png");
    this.load.image("hearse", "/game/sprites/hearse.png");
  }

  create() {
    this.options = this.registry.get("options") as CreateGameOptions;
    const hero = this.options.hero;
    const stats = HEROES[hero];
    this.upgrades = this.options.upgrades ?? emptyUpgrades();
    this.maxHp = stats.hp + extraHp(this.upgrades);
    this.hp = this.maxHp;
    this.guestMax = LEVEL.pows.length;

    unlockAudio();
    this.input.once("pointerdown", () => unlockAudio());

    this.makeAnims();
    this.buildWorld();
    this.spawnPlayer();
    this.spawnPickables();
    this.spawnEnemies();
    this.spawnBoss();
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
      for (const k of [`${h}-idle`, `${h}-run`, `${h}-jump`, `${h}-crouch`]) {
        if (this.anims.exists(k)) this.anims.remove(k);
      }
      mk(`${h}-idle`, `${h}-idle`, IDLE_FRAMES, 4, -1);
      mk(`${h}-run`, `${h}-run`, RUN_FRAMES, 10, -1);
      mk(`${h}-jump`, `${h}-jump`, JUMP_FRAMES, 8, 0);
      mk(`${h}-crouch`, `${h}-crouch`, CROUCH_FRAMES, 6, -1);
    }
    if (this.anims.exists("skeleton")) this.anims.remove("skeleton");
    mk("skeleton", "skeleton", 4, 8, -1);
    mk("skeleton-shoot", "skeleton-shoot", 4, 10, 0);
    if (this.anims.exists("ghost")) this.anims.remove("ghost");
    mk("ghost", "ghost", 4, 6, -1);
    mk("ghost-shoot", "ghost-shoot", 4, 10, 0);
    mk("bat", "bat", 4, 10, -1);
    mk("explode", "explode", 4, 14, 0);
    mk("coin", "coin", 4, 8, -1);
    mk("bullet", "bullet", 4, 12, -1);
    mk("enemy-shot", "enemy-shot", 4, 14, -1);
    mk("muzzle", "muzzle", 4, 18, 0);
    mk("laser", "laser", 4, 16, -1);
    mk("rocket", "rocket", 4, 12, -1);
    mk("grenade", "grenade", 4, 10, -1);
    mk("slash", "slash", 4, 18, 0);
  }

  buildWorld() {
    const sky = this.add.image(0, -40, "sky").setOrigin(0, 0).setScrollFactor(0.1, 0).setDepth(-20);
    sky.setDisplaySize(LEVEL_W, 460);
    const mid = this.add.image(0, 80, "mid").setOrigin(0, 0).setScrollFactor(0.32, 0).setDepth(-12);
    mid.setDisplaySize(LEVEL_W * 0.85, 420);
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

    this.bullets = this.physics.add.group({ maxSize: 96, allowGravity: false });
    this.enemyShots = this.physics.add.group({ maxSize: 64, allowGravity: false });

    LEVEL.pows.forEach((p, i) => {
      const s = this.physics.add.sprite(p.x, p.y, "goldie-idle", 0);
      s.setDisplaySize(64, 88);
      s.body?.setAllowGravity(false);
      s.setDepth(6);
      s.setTint(0xffd4a8);
      this.tweens.add({ targets: s, y: p.y - 5, yoyo: true, duration: 900, repeat: -1, ease: "Sine.easeInOut" });
      this.pows.push({ id: i, spr: s, taken: false, drop: p.drop });
      this.physics.add.overlap(this.player, s, () => this.takePow(i));
    });
    LEVEL.breaks.forEach((b, i) => {
      const tex = b.kind === "crate" ? "crate" : b.kind === "pew" ? "plat" : b.kind === "tomb" ? "ckpt" : "crate";
      const s = this.physics.add.sprite(b.x, b.y, tex, 0);
      s.setDisplaySize(b.kind === "pew" ? 70 : 44, b.kind === "pew" ? 28 : 36);
      s.body?.setAllowGravity(false);
      s.setDepth(5);
      if (b.kind === "barrel") s.setTint(0xb06a3a);
      if (b.kind === "tomb") s.setTint(0x9aa3a8);
      this.breaks.push({ id: i, spr: s, hp: b.hp, taken: false, drop: b.drop });
    });
  }

  spawnEnemies() {
    LEVEL.enemies.forEach((e, i) => {
      const tex = this.enemyTex(e.kind);
      const s = this.physics.add.sprite(e.x, e.y, tex, 0);
      const short = Boolean(e.short);
      const size = this.enemySize(e.kind, short);
      s.setDisplaySize(size.w, size.h);
      s.setDepth(8);
      if (this.anims.exists(tex)) s.play(tex, true);
      this.tintEnemy(s, e.kind);
      const body = s.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(size.bodyW, size.bodyH);
      body.setOffset((HERO_FRAME - size.bodyW) / 2, HERO_FRAME - size.bodyOff);
      if (e.kind === "hearse") {
        body.setSize(s.width * 0.78, s.height * 0.5);
        body.setOffset(s.width * 0.1, s.height * 0.28);
      }
      const hp = this.enemyHp(e.kind, short);
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
        armored: e.kind === "usher" || e.kind === "hearse",
        faceT: 0,
      });
    });
  }

  enemyTex(kind: EnemyKind): string {
    if (kind === "hearse") return "hearse";
    if (kind === "usher" || kind === "bomber") return "skeleton";
    if (kind === "priest") return "ghost";
    if (kind === "gargoyle") return "bat";
    return kind;
  }

  enemySize(kind: EnemyKind, short: boolean) {
    if (kind === "hearse") return { w: 220, h: 120, bodyW: 200, bodyH: 140, bodyOff: 160 };
    if (kind === "usher") return { w: 110, h: 136, bodyW: 120, bodyH: 170, bodyOff: 176 };
    if (kind === "bomber") return { w: 88, h: 118, bodyW: 100, bodyH: 160, bodyOff: 170 };
    if (kind === "gargoyle") return { w: 78, h: 64, bodyW: 130, bodyH: 100, bodyOff: 150 };
    if (kind === "priest") return { w: 90, h: 118, bodyW: 100, bodyH: 160, bodyOff: 170 };
    if (short) return { w: 72, h: 48, bodyW: 110, bodyH: 72, bodyOff: 80 };
    if (kind === "bat") return { w: 70, h: 52, bodyW: 120, bodyH: 90, bodyOff: 140 };
    if (kind === "ghost") return { w: 86, h: 110, bodyW: 100, bodyH: 160, bodyOff: 170 };
    return { w: 92, h: 124, bodyW: 100, bodyH: 160, bodyOff: 170 };
  }

  enemyHp(kind: EnemyKind, short: boolean) {
    if (kind === "hearse") return 18;
    if (kind === "usher") return 6;
    if (kind === "priest") return 4;
    if (kind === "bomber") return 2;
    if (kind === "gargoyle") return 4;
    if (kind === "skeleton") return short ? 2 : 3;
    if (kind === "ghost") return 2;
    return 1;
  }

  tintEnemy(s: Phaser.Physics.Arcade.Sprite, kind: EnemyKind) {
    if (kind === "usher") s.setTint(0x6a7ab5);
    else if (kind === "bomber") s.setTint(0xc45a3a);
    else if (kind === "priest") s.setTint(0xd4b46a);
    else if (kind === "gargoyle") s.setTint(0x8a8a8a);
    else if (kind === "hearse") s.clearTint();
  }

  spawnBoss() {
    const b = LEVEL.boss;
    if (!b) return;
    const s = this.physics.add.sprite(b.x, b.y, "lychwing");
    s.setDisplaySize(520, 280);
    s.setDepth(7);
    const body = s.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(s.width * 0.72, s.height * 0.45);
    const extra = this.options.net.remotes.size * 4;
    const hp = b.hp + extra;
    this.boss = { spr: s, hp, max: hp, phase: 1, t: 1.4, alive: true, locked: false };
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
    add("L", Phaser.Input.Keyboard.KeyCodes.L);
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
      this.prevJump = this.prevShoot = this.prevKnife = this.prevGrenade = true;
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
      .text(W / 2, H - 18, "A/D move   W jump   S crouch   J fire   K knife   L grenade", {
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
    this.hudHp.setText(`${HEROES[this.options.hero].name}  ${this.hp}/${this.maxHp}  G${this.grenades}`);
    this.hudCoins.setText(`RINGS ${this.teamCoins + this.coinsLocal}   GUESTS ${this.guests}/${this.guestMax}`);
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
      grenades: this.grenades,
      guests: this.guests,
      guestMax: this.guestMax,
      lives: this.lives,
      banner: this.won ? "win" : this.dead ? "dead" : "play",
      bossHp: this.boss?.alive && this.boss.locked ? this.boss.hp : undefined,
      bossMax: this.boss?.alive && this.boss.locked ? this.boss.max : undefined,
      bossName: this.boss?.alive && this.boss.locked ? "THE LYCHWING" : undefined,
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
    this.knifeCd = Math.max(0, this.knifeCd - dt);
    this.grenadeCd = Math.max(0, this.grenadeCd - dt);
    this.spawnProtect = Math.max(0, this.spawnProtect - dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.squashT = Math.max(0, this.squashT - dt);

    const actions = sampleActions(this);

    if (!this.dead && !this.won) this.controlPlayer(actions, dt);
    this.stepMovers(dt);
    if (this.options.net.isHost) {
      this.stepEnemies(dt);
      this.stepBoss(dt);
    } else {
      this.applyWorld();
      for (const e of this.enemies) {
        if (!e.alive) continue;
        this.hitEnemyWithBullets(e);
        if (e.kind !== "skeleton" && e.kind !== "usher" && this.physics.world.overlap(this.player, e.sprite)) this.hurt(1);
      }
    }
    this.hitBreaks();
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
    if (!this.grounded && body.velocity.y >= -50) {
      const feetY = this.player.y + (this.crouching ? 52 : 70);
      const px = this.player.x;
      const onPlat = (obj: Phaser.GameObjects.GameObject) => {
        const anyObj = obj as unknown as { getBounds?: () => Phaser.Geom.Rectangle };
        if (typeof anyObj.getBounds !== "function") return false;
        const b = anyObj.getBounds();
        return px > b.left - 10 && px < b.right + 10 && Math.abs(feetY - b.top) < 14;
      };
      if (this.solids.getChildren().some(onPlat) || this.oneWays.getChildren().some(onPlat)) this.grounded = true;
    }
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

    const max = (this.crouching ? stats.speed * 0.38 : stats.speed) * speedMul(this.upgrades);
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
    if (actions.knifePressed && this.knifeCd <= 0) this.knife();
    if ((actions.grenadePressed || actions.grenadeHeld) && this.grenadeCd <= 0 && this.grenades > 0) this.throwFrag();
  }

  fire() {
    const gun = WEAPONS[this.weapon];
    const stats = HEROES[this.options.hero];
    const rate = gunneryMul(this.upgrades);
    this.fireCd = gun.cooldown / stats.fire / rate;
    if (gun.ammo !== Infinity) {
      this.ammo -= 1;
      if (this.ammo <= 0) {
        this.weapon = "pistol";
        this.ammo = Infinity;
      }
    }
    sfx.shoot(gun.id);
    this.trauma = Math.min(1, this.trauma + (gun.id === "rocket" ? 0.35 : gun.id === "shotgun" ? 0.22 : gun.id === "laser" ? 0.04 : 0.08));
    this.punchScale(0.92, 1.06, 70);
    const originX = this.player.x + this.facing * (this.crouching ? 40 : 34);
    const originY = this.player.y + (this.crouching ? 28 : -10);
    this.flashMuzzle(originX, originY, this.facing);
    const tex = gun.id === "rocket" ? "rocket" : gun.id === "laser" ? "laser" : "bullet";
    const shotSpeed = gun.speed * rate;
    const dmg = Math.max(1, Math.round(gun.damage * dmgMul(this.upgrades)));
    for (let i = 0; i < gun.count; i++) {
      const spr = this.bullets.get(originX, originY, tex) as Phaser.Physics.Arcade.Sprite | null;
      if (!spr) continue;
      spr.setActive(true).setVisible(true);
      const dw = gun.id === "rocket" ? 42 : gun.id === "laser" ? 56 : gun.id === "shotgun" ? 12 : 16;
      const dh = gun.id === "rocket" ? 22 : gun.id === "laser" ? 18 : 10;
      spr.setDisplaySize(dw, dh);
      spr.clearTint();
      if (gun.id === "heavy") spr.setTint(0xffe08a);
      const body = spr.body as Phaser.Physics.Arcade.Body;
      body.enable = true;
      body.setAllowGravity(false);
      const spread = (Math.random() - 0.5) * gun.spread + (i - (gun.count - 1) / 2) * (gun.spread * 0.6);
      const vx = Math.cos(spread) * shotSpeed * this.facing;
      const vy = Math.sin(spread) * shotSpeed;
      spr.setVelocity(vx, vy);
      spr.setFlipX(this.facing < 0);
      spr.setRotation(gun.id === "laser" || gun.id === "rocket" ? 0 : 0);
      if (this.anims.exists(tex)) spr.play(tex, true);
      (spr as Phaser.Physics.Arcade.Sprite & { dat?: BulletData }).dat = {
        life: gun.life,
        dmg,
        owner: "player",
        explode: gun.explode,
        pid: this.options.net.selfId,
        pierce: gun.id === "laser",
        hit: gun.id === "laser" ? new Set() : undefined,
        kind: gun.id,
      };
    }
    this.refreshHud();
  }

  knife() {
    this.knifeCd = KNIFE.cooldown;
    sfx.hit();
    this.punchScale(1.08, 0.92, 80);
    const x = this.player.x + this.facing * 48;
    const y = this.player.y + (this.crouching ? 22 : -6);
    const fx = this.add.sprite(x, y, "slash", 0).setDepth(18);
    fx.setDisplaySize(70, 54);
    fx.setFlipX(this.facing < 0);
    if (this.anims.exists("slash")) fx.play("slash");
    fx.once("animationcomplete", () => fx.destroy());
    this.time.delayedCall(220, () => fx.destroy());
    const dmg = Math.max(1, Math.round(KNIFE.damage * dmgMul(this.upgrades)));
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.sprite.x - x) < KNIFE.range && Math.abs(e.sprite.y - y) < 56) {
        if (this.options.net.isHost) this.damageEnemy(e, dmg, e.sprite.x, e.sprite.y, 0);
        else this.options.net.sendEvent({ t: "hit", id: e.id, dmg });
      }
    }
    this.hitBoss(dmg, x, y, 0);
  }

  throwFrag() {
    this.grenadeCd = FRAG.cooldown;
    this.grenades = Math.max(0, this.grenades - 1);
    sfx.shoot("rocket");
    const originX = this.player.x + this.facing * 28;
    const originY = this.player.y - 8;
    const spr = this.bullets.get(originX, originY, "grenade") as Phaser.Physics.Arcade.Sprite | null;
    if (!spr) return;
    spr.setActive(true).setVisible(true);
    spr.setDisplaySize(22, 22);
    spr.clearTint();
    const body = spr.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.setGravityY(1600);
    body.setBounce(0.45, 0.35);
    spr.setVelocity(FRAG.speed * this.facing, -280);
    if (this.anims.exists("grenade")) spr.play("grenade", true);
    (spr as Phaser.Physics.Arcade.Sprite & { dat?: BulletData }).dat = {
      life: FRAG.life,
      dmg: Math.max(1, Math.round(FRAG.damage * dmgMul(this.upgrades))),
      owner: "player",
      explode: FRAG.explode,
      pid: this.options.net.selfId,
      kind: "grenade",
    };
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
      e.faceT = Math.max(0, e.faceT - dt);

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
          } else if (e.kind === "priest") {
            this.enemyShoot(s.x + e.facing * 18, s.y - 24, e.facing * 160, -220);
          } else if (e.kind === "hearse") {
            this.enemyShoot(s.x + e.facing * 80, s.y - 10, e.facing * 280, -40);
          } else if (e.kind === "gargoyle") {
            this.enemyShoot(s.x + e.facing * 20, s.y + 8, e.facing * 190, 80);
          } else {
            this.enemyShoot(s.x + e.facing * 26, s.y - 16, e.facing * ENEMY_SHOT_SPEED, 0);
          }
          sfx.enemyShot();
          e.mode = "recover";
          e.modeT = ENEMY_RECOVER;
          s.clearTint();
          this.tintEnemy(s, e.kind);
        }
        this.hitEnemyWithBullets(e);
        continue;
      }

      if (e.mode === "recover") {
        if (e.modeT <= 0) {
          e.mode = "move";
          const rec = this.enemyTex(e.kind);
          if (this.anims.exists(rec)) s.play(rec, true);
          this.tintEnemy(s, e.kind);
        }
        this.hitEnemyWithBullets(e);
        continue;
      }

      if (e.kind === "skeleton" || e.kind === "usher") {
        this.patrolFacing(e);
        body.setVelocity((e.kind === "usher" ? 32 : 55) * e.facing, 0);
        s.setFlipX(e.facing < 0);
        if (s.anims.currentAnim?.key !== "skeleton") s.play("skeleton", true);
        const ahead = (px - s.x) * e.facing > 50;
        if (!e.short && e.shootT <= 0 && ahead && Math.abs(s.x - px) < 460 && Math.abs(s.y - py) < 140) {
          this.beginWindup(e, px);
        }
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
      } else if (e.kind === "bomber") {
        this.faceToward(e, px, 36);
        s.setFlipX(e.facing < 0);
        body.setVelocity(140 * e.facing, 0);
        const pulse = 0.55 + 0.45 * Math.sin(e.phase * 8);
        s.setTint(Phaser.Display.Color.GetColor(200, 40 + 80 * pulse, 30));
        if (s.anims.currentAnim?.key !== "skeleton") s.play("skeleton", true);
        if (Math.abs(s.x - px) < 54 && Math.abs(s.y - py) < 70) {
          this.boom(s.x, s.y, 70);
          this.hurt(1);
          this.killEnemy(e, true);
        }
      } else if (e.kind === "ghost" || e.kind === "priest") {
        const dx = px - s.x;
        const dy = py - 30 - s.y;
        this.faceToward(e, px, 48);
        body.setVelocity(Math.sign(dx || e.facing) * (e.kind === "priest" ? 22 : 40), Math.sin(e.phase * 2) * 30 + Math.sign(dy) * 22);
        s.setFlipX(e.facing < 0);
        if (s.anims.currentAnim?.key !== "ghost") s.play("ghost", true);
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
        if (e.shootT <= 0 && Math.abs(s.x - px) < 420) this.beginWindup(e, px);
      } else if (e.kind === "gargoyle") {
        body.setVelocity(0, Math.sin(e.phase * 1.6) * 18);
        if (e.shootT <= 0 && Math.abs(s.x - px) < 520) this.beginWindup(e, px);
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
      } else if (e.kind === "hearse") {
        body.setVelocity(0, 0);
        if (e.shootT <= 0 && Math.abs(s.x - px) < 560) this.beginWindup(e, px);
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
      } else {
        body.setVelocity(Math.sin(e.phase * 1.4) * 90, Math.cos(e.phase * 2.1) * 50);
        s.setFlipX(e.facing < 0);
        if (this.physics.world.overlap(this.player, s)) this.hurt(1);
      }
      this.hitEnemyWithBullets(e);
    }
  }

  patrolFacing(e: EnemyObj) {
    const x = e.sprite.x;
    if (x > e.homeX + e.patrol && e.facing === 1) this.setFacing(e, -1, 0.35);
    else if (x < e.homeX - e.patrol && e.facing === -1) this.setFacing(e, 1, 0.35);
  }

  faceToward(e: EnemyObj, tx: number, deadzone: number) {
    const dx = tx - e.sprite.x;
    if (dx > deadzone) this.setFacing(e, 1, 0.4);
    else if (dx < -deadzone) this.setFacing(e, -1, 0.4);
  }

  setFacing(e: EnemyObj, dir: 1 | -1, lock: number) {
    if (dir === e.facing) return;
    if (e.faceT > 0) return;
    e.facing = dir;
    e.faceT = lock;
  }

  beginWindup(e: EnemyObj, px: number) {
    e.mode = "windup";
    e.modeT = ENEMY_WINDUP;
    e.shootT = e.kind === "ghost" || e.kind === "priest" ? 2.2 : e.kind === "hearse" ? 2.6 : 1.7 + Math.random() * 0.7;
    if (e.kind === "ghost" || e.kind === "priest" || e.kind === "gargoyle" || e.kind === "hearse") {
      e.facing = px >= e.sprite.x ? 1 : -1;
      e.faceT = 0.55;
    }
    e.sprite.setFlipX(e.facing < 0);
    const key = e.kind === "ghost" || e.kind === "priest" ? "ghost-shoot" : "skeleton-shoot";
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
      if (bullet.dat.pierce && bullet.dat.hit?.has(e.id)) continue;
      if (e.armored && bullet.dat.kind !== "rocket" && bullet.dat.kind !== "grenade" && bullet.dat.kind !== "laser") {
        // ushers eat frontal pistol pellets; still chip
      }
      if (this.options.net.isHost) {
        this.damageEnemy(e, bullet.dat.dmg, bullet.x, bullet.y, bullet.dat.explode);
      } else {
        this.options.net.sendEvent({ t: "hit", id: e.id, dmg: bullet.dat.dmg });
      }
      if (bullet.dat.pierce) {
        bullet.dat.hit?.add(e.id);
      } else {
        this.killBullet(bullet);
      }
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
        if (s.dat.kind === "rocket" && Math.random() < 0.5) {
          this.puff(s.x - Math.sign(s.body?.velocity.x ?? 1) * 10, s.y, 1);
        }
        if (s.dat.kind === "grenade" && (s.body as Phaser.Physics.Arcade.Body).blocked.down && s.dat.life < 1.2) {
          this.boom(s.x, s.y, s.dat.explode);
          this.killBullet(s);
          continue;
        }
        if (s.dat.life <= 0 || s.x < this.cameras.main.scrollX - 80 || s.x > this.cameras.main.scrollX + W + 80) {
          if (s.dat.kind === "grenade" || s.dat.explode > 0) this.boom(s.x, s.y, Math.max(40, s.dat.explode));
          if (s.dat.sid != null) this.shotIndex.delete(s.dat.sid);
          this.killBullet(s);
          continue;
        }
        if (s.dat.owner === "player" && this.boss?.alive) {
          this.hitBoss(s.dat.dmg, s.x, s.y, s.dat.explode, s);
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
    this.time.delayedCall(50, () => {
      e.sprite.clearTint();
      this.tintEnemy(e.sprite, e.kind);
    });
    if (explode > 0) this.boom(x, y, explode);
    if (e.hp <= 0) this.killEnemy(e, true);
  }

  killEnemy(e: EnemyObj, juice: boolean) {
    e.alive = false;
    e.sprite.setActive(false).setVisible(false);
    (e.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    if (juice) {
      this.boom(e.sprite.x, e.sprite.y, e.kind === "hearse" ? 90 : 40);
      sfx.explode();
      if (e.kind === "hearse") {
        this.grenades = Math.min(FRAG.cap, this.grenades + 6);
        this.flashBanner("HEARSE WRECK — ROCKET");
        this.weapon = "rocket";
        this.ammo = WEAPONS.rocket.ammo;
        this.refreshHud();
      }
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
      if (this.boss?.alive && Phaser.Math.Distance.Between(x, y, this.boss.spr.x, this.boss.spr.y) < radius + 80) {
        this.hitBoss(2, x, y, 0);
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
    if (this.boss?.alive) return;
    if (Math.abs(this.player.x - LEVEL.flag.x) < 80 && this.player.y < LEVEL.flag.y + 20 && this.player.y > LEVEL.flag.y - 160) {
      this.triggerWin();
    }
  }

  takePow(id: number) {
    const p = this.pows[id];
    if (!p || p.taken) return;
    p.taken = true;
    p.spr.setVisible(false);
    (p.spr.body as Phaser.Physics.Arcade.Body).enable = false;
    this.guests += 1;
    if (p.drop === "grenade") this.grenades = Math.min(FRAG.cap, this.grenades + 10);
    else this.coinsLocal += 5;
    sfx.pickup();
    this.flashBanner(p.drop === "grenade" ? "GUEST SAVED — FRAGS" : "GUEST SAVED");
    this.options.net.sendEvent({ t: "pow", id });
    this.refreshHud();
  }

  hitBreaks() {
    for (const b of this.breaks) {
      if (b.taken) continue;
      for (const child of this.bullets.getChildren()) {
        const bullet = child as Phaser.Physics.Arcade.Sprite & { dat?: BulletData };
        if (!bullet.active || !bullet.dat || bullet.dat.owner !== "player") continue;
        if (!this.physics.world.overlap(bullet, b.spr)) continue;
        b.hp -= bullet.dat.dmg;
        if (!bullet.dat.pierce) this.killBullet(bullet);
        if (b.hp <= 0) {
          b.taken = true;
          b.spr.setVisible(false);
          (b.spr.body as Phaser.Physics.Arcade.Body).enable = false;
          this.boom(b.spr.x, b.spr.y, 28);
          if (b.drop === "grenade") this.grenades = Math.min(FRAG.cap, this.grenades + 10);
          if (b.drop === "rings") this.coinsLocal += 3;
          this.refreshHud();
          this.options.net.sendEvent({ t: "break", id: b.id });
        }
      }
    }
  }

  hitBoss(dmg: number, x: number, y: number, explode: number, bullet?: Phaser.Physics.Arcade.Sprite & { dat?: BulletData }) {
    if (!this.boss?.alive) return;
    if (bullet && !this.physics.world.overlap(bullet, this.boss.spr)) return;
    this.boss.hp -= dmg;
    this.boss.spr.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.boss?.spr.clearTint());
    this.trauma = Math.min(1, this.trauma + 0.22);
    if (explode > 0) this.boom(x, y, explode);
    if (bullet && !bullet.dat?.pierce) this.killBullet(bullet);
    if (this.boss.hp <= this.boss.max * 0.6 && this.boss.phase === 1) {
      this.boss.phase = 2;
      this.flashBanner("LYCHWING — NAVE LASER");
    }
    if (this.boss.hp <= this.boss.max * 0.3 && this.boss.phase === 2) {
      this.boss.phase = 3;
      this.flashBanner("LYCHWING — LAST RITES");
    }
    if (this.boss.hp <= 0) this.killBoss();
    this.refreshHud();
  }

  killBoss() {
    if (!this.boss || !this.boss.alive) return;
    this.boss.alive = false;
    this.boss.hp = 0;
    this.boom(this.boss.spr.x, this.boss.spr.y, 140);
    this.boom(this.boss.spr.x - 80, this.boss.spr.y + 20, 80);
    this.boom(this.boss.spr.x + 90, this.boss.spr.y - 10, 80);
    this.tweens.add({
      targets: this.boss.spr,
      alpha: 0,
      y: this.boss.spr.y + 40,
      duration: 900,
      onComplete: () => this.boss?.spr.destroy(),
    });
    this.flashBanner("THE HEARSE IS ALREADY GONE");
    this.time.delayedCall(1600, () => this.triggerWin());
    this.refreshHud();
  }

  stepBoss(dt: number) {
    const b = this.boss;
    if (!b?.alive) return;
    const arena = LEVEL.boss?.arenaX ?? 11200;
    if (!b.locked && this.player.x > arena) {
      b.locked = true;
      this.flashBanner("THE LYCHWING");
    }
    if (!b.locked) return;
    if (this.player.x < arena) this.player.x = arena;
    b.t -= dt;
    b.spr.y = (LEVEL.boss?.y ?? 210) + Math.sin(this.time.now / 700) * 10;
    if (b.t > 0) return;
    if (b.phase === 1) {
      b.spr.setTint(0xffe6a8);
      this.time.delayedCall(280, () => b.spr.clearTint());
      this.enemyShoot(b.spr.x - 80, b.spr.y + 40, -40, 220);
      this.enemyShoot(b.spr.x, b.spr.y + 50, 0, 240);
      this.enemyShoot(b.spr.x + 80, b.spr.y + 40, 40, 220);
      sfx.enemyShot();
      b.t = 1.6;
    } else if (b.phase === 2) {
      const y = GROUND - 80;
      const beam = this.add.rectangle(b.spr.x - 40, y, 18, 8, 0xff3355, 0.9).setDepth(15);
      this.tweens.add({
        targets: beam,
        x: this.player.x,
        displayWidth: 28,
        displayHeight: 420,
        y: y - 160,
        duration: 420,
        onComplete: () => {
          if (Math.abs(this.player.x - beam.x) < 50) this.hurt(1);
          beam.destroy();
        },
      });
      sfx.windup();
      b.t = 2.1;
    } else {
      b.spr.setTint(0xffe6a8);
      this.time.delayedCall(200, () => b.spr.clearTint());
      this.enemyShoot(b.spr.x - 60, b.spr.y + 30, -120, 160);
      this.enemyShoot(b.spr.x + 60, b.spr.y + 30, 120, 160);
      this.enemyShoot(b.spr.x, b.spr.y + 40, 0, 260);
      sfx.explode();
      b.t = 1.15;
    }
    this.refreshHud();
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
        grenades: this.grenades,
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
    if (ev.t === "pow") this.takePow(ev.id);
    if (ev.t === "break") {
      const b = this.breaks[ev.id];
      if (b && !b.taken) {
        b.taken = true;
        b.spr.setVisible(false);
      }
    }
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
