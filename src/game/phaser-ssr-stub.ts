/** Server stub — Phaser touches `window` at import and cannot load in SSR. */
const Phaser = new Proxy(function Phaser() {}, {
  get: () => Phaser,
}) as unknown as typeof import("phaser");

export default Phaser;
export { Phaser };
