import * as PhaserNS from "phaser";

type PhaserType = typeof import("phaser");

const mod = PhaserNS as unknown as { default?: PhaserType } & PhaserType;
const Phaser = (mod.default ?? mod) as PhaserType;

export default Phaser;
export { Phaser };
