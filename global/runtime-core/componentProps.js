import { reactive } from "../core/reactive.js";

export function initProps(instance, rawProps) {
  // instance.attrs  instance.props

  // 表单组件  el-input type="promary" placehoder  autofus autocompilete
  const props = {};
  const attrs = {};
  const options = instance.propsOptions;
  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key];
      if (key in options) {
        props[key] = value; // 这就是属性
      } else {
        attrs[key] = value;
      }
    }
  }
  instance.props = reactive(props); // 原则上props只需要管第一层就可以了
  instance.attrs = attrs;
}
