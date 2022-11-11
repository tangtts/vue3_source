import {ReactiveFlags} from "../core/reactive.js"
export function isObject(value) {
  return typeof value === 'object' && value !== null
}


export function isFunction(value) {
  return typeof value === "function"
}

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

