export let activeEffect = undefined;

// 每次执行依赖收集前，先做清理操作
function cleanupEffect(effect) {
  // 每次执行effect之前 我们应该清理掉effect中依赖的所有属性
  // 反向查找，通过 effect 找 deps -> reactive 身上的 属性的 dep
  // 再把 deps 身上的effect 去除掉
  let { deps } = effect;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect); // 属性记录了effect  {key:new set()}
  }
  effect.deps.length = 0; // 清理对应的数组的
}

export class ReactiveEffect {
  active = true;
  deps = []; // 收集effect中使用到的属性
  parent = undefined;
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    if (!this.active) {
      // 不是激活状态
      return this.fn();
    }
    try {
      this.parent = activeEffect; // 当前的effect就是他的父亲
      activeEffect = this; // 设置成正在激活的是当前effect

      cleanupEffect(this);

      return this.fn();
    } finally {
      activeEffect = this.parent; // 执行完毕后还原activeEffect
      this.parent = undefined;
    }
  }

  stop() {
    if (this.active) {
      cleanupEffect(this); // 先将effect的依赖全部删除掉
      this.active = false; // 在将其变成失活态
    }
  }
}

export function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler); // 创建响应式effect
  _effect.run(); // 让响应式effect默认执行

  // 如果以后有需要的话，可以自己执行
  const runner = _effect.run.bind(_effect); // 保证_effect执行的时候this是当前的effect
  runner.effect = _effect;
  return runner;
}
