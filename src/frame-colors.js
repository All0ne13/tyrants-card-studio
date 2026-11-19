export const isFrameColor = (v) => /^#[0-9a-f]{6}$/i.test(v);

export class FrameColors {
  constructor(recent = []) {
    this.recent = [
      ...new Set(recent.filter(isFrameColor).map((c) => c.toLowerCase())),
    ].slice(0, 8);
    this.past = new Map();
    this.pending = null;
  }
  begin(id, color) {
    if (this.pending?.id !== id)
      this.pending = { id, color: color.toLowerCase() };
  }
  finish(id, color) {
    color = color.toLowerCase();
    if (!isFrameColor(color) || this.pending?.id !== id) return;
    const before = this.pending.color;
    this.pending = null;
    if (before === color) return;
    this.past.set(id, [...(this.past.get(id) || []), before].slice(-20));
    this.remember(before);
    this.remember(color);
  }
  remember(color) {
    this.recent = [color, ...this.recent.filter((c) => c !== color)].slice(
      0,
      8,
    );
  }
  canUndo(id) {
    return !!this.past.get(id)?.length;
  }
  undo(id) {
    const color = this.past.get(id)?.pop();
    if (color) this.remember(color);
    return color;
  }
}
