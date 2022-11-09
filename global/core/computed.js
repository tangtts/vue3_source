import { isFunction } from "/global/utils/shared.js";
import { activeEffect, ReactiveEffect } from "./effect.js";

import { trackEffects, triggerEffects } from "./track.js";

const noop = () => {};
let f = undefined;
class ComputedRefImpl {
  dep = undefined;
  effect = undefined;
  __v_isRef = true; // 意味着有这个属性 需要用.value来取值
  _dirty = true;
  _value; // 默认的缓存结果

  constructor(getter, setter) {
    this.effect = new ReactiveEffect(getter, () => {
      this._dirty = true;
      console.log(123)
      // 只有在这个时候触发 effect 的run 或者 每一个effect 的 调度函数
      triggerEffects(this.dep);
    });
    this.setter = setter;
  }
  get value() {
    if (activeEffect) {
      // 如果有activeEffect 意味着这个计算属性在effct中使用
      // 需要让计算属性收集这个effect
      // 用户取值发生依赖收集

      // 收集全局变量 activeEffect 
      // 在dep 中添加
      trackEffects(this.dep || (this.dep = new Set()));
    }
    if (this._dirty) {
      // 取值才执行，并且把取到的值缓存起来
      // run 的时候改变全局 activeEffect
      // run 执行触发 this.fn => getter 执行
      // 
      this._value = this.effect.run();
      this._dirty = false; // 意味着取过了
    }
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
}
export function computed(getterOrOptions) {
  let onlyGetter = isFunction(getterOrOptions);

  let getter;
  let setter;

  if (onlyGetter) {
    getter = getterOrOptions;
    setter = noop;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set || noop;
  }

  // getter=方法必须存在

  return new ComputedRefImpl(getter, setter);
}
setTimeout(() => {
  console.log(f);
}, 2000);
