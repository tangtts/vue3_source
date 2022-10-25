export let activeEffect = undefined;

class ReactiveEffect {
  active = true;
  deps = []; // 收集effect中使用到的属性
  parent = undefined;
  constructor(fn) {
    this.fn = fn
   }
  run() {
      if (!this.active) { // 不是激活状态
          return this.fn();
      }
      try {
          this.parent = activeEffect; // 当前的effect就是他的父亲
          activeEffect = this; // 设置成正在激活的是当前effect
        return this.fn();
      } finally {
          activeEffect = this.parent; // 执行完毕后还原activeEffect
          this.parent = undefined;
      }
  }
}


export function effect(fn, options) {
  const _effect = new ReactiveEffect(fn); // 创建响应式effect
  _effect.run(); // 让响应式effect默认执行
}