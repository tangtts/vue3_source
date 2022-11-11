// 对元素可以进行节点操作

import { nodeOps } from "./nodeOps.js";

import { patchProp } from "./pathProp.js";

import { createRenderer } from "../runtime-core/index.js";

const renderOptions = Object.assign(nodeOps, { patchProp });

export {h} from "../runtime-core/h.js"
// dom操作api

export const render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
