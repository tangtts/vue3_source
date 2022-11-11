import { isObject } from "../utils/shared.js";
import { track, trigger } from "./track.js";
export const ReactiveFlags = {
  IS_REACTIVE: "__v_isReactive",
};


function createReactiveObject(target, isReadonly) {
  if (!isObject(target)) {
    return target;
  }

  const exisitingProxy = reactiveMap.get(target); // 如果已经代理过则直接返回代理后的对象
  if (exisitingProxy) {
    return exisitingProxy;
  }

  const proxy = new Proxy(target, mutableHandlers); // 对对象进行代理
  reactiveMap.set(target, proxy);
  return proxy;
}


const reactiveMap = new WeakMap(); // 缓存列表
const mutableHandlers = {
  get(target, key, receiver) {
    // 等会谁来取值就做依赖收集
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 在get中增加标识，当获取IS_REACTIVE时返回true
      return true;
    }
    const res = Reflect.get(target, key, receiver);
    track(target, key); // 依赖收集
    return res;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    const result = Reflect.set(target, key, value, receiver);

    if (oldValue !== value) {
      // 先设置为新的值，然后再触发
      trigger(target, key, value, oldValue);
    }
    return result;
  },
};
// 常用的就是reactive方法
export function reactive(target) {
  if (target[ReactiveFlags.IS_REACTIVE]) {
    // 在创建响应式对象时先进行取值，看是否已经是响应式对象
    return target;
  }
  return createReactiveObject(target, false);
}
