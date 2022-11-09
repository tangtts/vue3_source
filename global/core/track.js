import { activeEffect } from "./effect.js";
const targetMap = new WeakMap(); // 记录依赖关系
export function track(target, key) {
  // 没有在 effect 中触发
  if (activeEffect) {
    let depsMap = targetMap.get(target); // {对象：map}
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    // set 中使用原因是 effect(()=>{ state.name,state.name }) 多次使用
    // set 添加当前的执行环境，也就是 taget 的key 发生变换，可以通知我记录的 effect函数变化
    if (!dep) {
      depsMap.set(key, (dep = new Set())); // {对象：{ 属性 :[ dep, dep ]}}
    }
    trackEffects(dep);

    // // effect(()=>{ state.a++ })
    // let shouldTrack = !dep.has(activeEffect)
    // // target -> key:[new Set(),new Set()]
    // if (shouldTrack) {
    //     dep.add(activeEffect);
    //     // [new ReactiveEffect,new ReactiveEffect]
    //     // ReactiveEffect:deps [new ReactiveEffect,new ReactiveEffect],fn:()=>{},active:false
    //     // 只是为了方便清理
    //     activeEffect.deps.push(dep); // 让effect记住dep，这样后续可以用于清理
    // }
  }
}

export function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect);
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep); // 后续需要通过effect来清理的时候可以去使用
    // 一个属性对应多个effect， 一个effect对应着多个属性
    // 属性 和 effect的关系是多对多的关系
  }
}

export function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target); // 获取对应的映射表

  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  triggerEffects(dep);
  //   effects && effects.forEach(effect => {
  //       if (effect !== activeEffect) {
  //         return  effect.run();
  //       } // 防止循环
  //   })
}

export function triggerEffects(dep) {
  if (dep) {
    const effects = [...dep];
    effects.forEach(effect => {
      // 当我重新执行此effect时，会将当前的effect放到全局上 activeEffect
      if (activeEffect != effect) {
        if (!effect.scheduler) {
          effect.run(); // 每次调用run 都会重新依赖收集
        } else {
          effect.scheduler();
        }
      }
    });
  }
}
