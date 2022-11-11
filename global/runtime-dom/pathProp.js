
import {patchAttr} from "./modules/attr.js"
import {patchClass} from "./modules/class.js"
import {patchEvent} from "./modules/event.js"
import {patchStyle} from "./modules/style.js"

// class style event attr
export const patchProp = (el, key, prevValue, nextValue) => {
  if (key === "class") {
    patchClass(el, nextValue);
  } else if (key === "style") {
    // {color:'red',background:red}   {color:'red'}
    patchStyle(el, prevValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    // onXxxx  on1
    // event
    // 事件操作？ addEventListener  removeEventListener
    // @click="fn1"       @click="fn2" ?
    // invoker.fn = fn1   invoker.fn = fn2
    // @click="()=>invoker.fn"   @click="()=> invoker.fn" ?

    patchEvent(el, key, nextValue);
  } else {
    //attr
    patchAttr(el, key, nextValue);
  }
};





