
import {activeEffect} from "./effect.js"
const targetMap = new WeakMap(); // 记录依赖关系
export function track(target, key) {
    // 没有在 effect 中触发
    if (activeEffect) {
        let depsMap = targetMap.get(target); // {对象：map}
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()))
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = new Set())) // {对象：{ 属性 :[ dep, dep ]}}
        }
        // effect(()=>{ state.a++ })
        let shouldTrack = !dep.has(activeEffect)
        // target -> key:[new Set(),new Set()]
        // set 中使用原因是 effect(()=>{ state.name,state.name }) 多次使用
        // set 添加当前的执行环境，也就是 taget 的key 发生变换，可以通知我记录的 effect函数变化
        if (shouldTrack) {
            dep.add(activeEffect);
            // [new ReactiveEffect,new ReactiveEffect]
            // ReactiveEffect:deps [new ReactiveEffect,new ReactiveEffect],fn:()=>{},active:false
            // console.log("🚀 ~ file: track.js ~ line 17 ~ track ~ dep", dep);
            // 只是为了方便清理
            activeEffect.deps.push(dep); // 让effect记住dep，这样后续可以用于清理
            // console.log("🚀 ~ file: track.js ~ line 18 ~ track ~ activeEffect", activeEffect);
        }
    }
}

export function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target); // 获取对应的映射表

  if (!depsMap) {
      return
  }
  const effects = depsMap.get(key);
  effects && effects.forEach(effect => {
      if (effect !== activeEffect) {
      return  effect.run();
      } // 防止循环
  })
}