class GameGlobalsClass {
  constructor() {
    this.armedBombs = [];
    this.tacticalViewActive = false;
    this.hitStopRequested = false;
    this._listeners = {
      armedBombsChanged: new Set(),
      tacticalViewChanged: new Set(),
    };
  }

  on(event, callback) {
    this._listeners[event]?.add(callback);
    return () => this._listeners[event]?.delete(callback);
  }

  _emit(event, ...args) {
    this._listeners[event]?.forEach((cb) => cb(...args));
  }

  registerArmedBomb(bomb) {
    if (this.armedBombs.includes(bomb)) return;
    this.armedBombs.push(bomb);
    this._emit('armedBombsChanged', this.armedBombs.length);
  }

  unregisterArmedBomb(bomb) {
    const idx = this.armedBombs.indexOf(bomb);
    if (idx === -1) return;
    this.armedBombs.splice(idx, 1);
    this._emit('armedBombsChanged', this.armedBombs.length);
  }

  setTacticalView(active) {
    if (this.tacticalViewActive === active) return;
    this.tacticalViewActive = active;
    this._emit('tacticalViewChanged', active);
  }

  detonateAll() {
    const bombs = this.armedBombs.filter((b) => b.active);
    bombs.forEach((bomb) => {
      if (typeof bomb.detonate === 'function') {
        bomb.detonate();
      }
    });
  }

  requestHitStop() {
    this.hitStopRequested = true;
  }

  consumeHitStop() {
    if (this.hitStopRequested) {
      this.hitStopRequested = false;
      return true;
    }
    return false;
  }

  reset() {
    this.armedBombs = [];
    this.tacticalViewActive = false;
    this.hitStopRequested = false;
    this._emit('armedBombsChanged', 0);
    this._emit('tacticalViewChanged', false);
  }
}

export const GameGlobals = new GameGlobalsClass();
