export let activeEffectScope;

class EffectScope {
  active = true;
  effects = []; //收集内部的effect
  parent;
  scopes; // 收集作用域上的 自己内部的effectScope
  constructor(detached = false) {
    if (!detached && activeEffectScope) {
      (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this);
    }
  }
  run(fn) {
    if (this.active) {
      try {
        this.parent = activeEffectScope;
        activeEffectScope = this;
        return fn();
      } finally {
        // 复原
        activeEffectScope = this.parent;
        this.parent = null;
      }
    }
  }
  stop() {
    if (this.active) {
      for (let i = 0; i < this.effects.length; i++) {
        this.effects[i].stop();
      }
      if (this.scopes) {
        for (let i = 0; i < this.scopes.length; i++) {
          this.scopes[i].stop();
        }
      }
    }
    this.active = false;
  }
}

export function recordEffectScope(effect) {
  if (activeEffectScope && activeEffectScope.active) {
    // 因为这个时候已经是 activeEffectScope 被替换成 EffectScope 实例 了
    activeEffectScope.effects.push(effect);
  }
}

export function effectScope(detached) {
  return new EffectScope(detached);
}
