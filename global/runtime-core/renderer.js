import { ShapeFlags } from "../utils/shared.js";
import { isSameVNode,Text,Fragment } from "./vnode.js";
import { getSequence } from "../../getSequence.js";
import {initProps} from "./componentProps.js"
import { ReactiveEffect } from "../core/effect.js";
import { reactive } from "../core/reactive.js";
import {queueJob} from "./scheduler.js"
export function createRenderer(options) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
  } = options;
  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], el);
    }
  };
  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };
  const mountElement = (vnode, container, anchor) => {
    const { type, props, children, shapeFlag } = vnode;
    // 创建元素
    const el = (vnode.el = hostCreateElement(type));
    // 增添属性
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    // 处理子节点
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    }
    hostInsert(el, container, anchor);
  };

  const patchProps = (oldProps, newProps, el) => {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        const prev = oldProps[key];
        const next = newProps[key];
        if (prev != next) {
          // 用新的改掉老的
          hostPatchProp(el, key, prev, next);
        }
      }
      for (let key in oldProps) {
        if (!(key in newProps)) {
          // 老的存在的新的没有了
          const prev = oldProps[key];
          hostPatchProp(el, key, prev, null);
        }
      }
    }
  };
  const patchKeyedChildren = (c1, c2, el) => {
    // 全量的diff算法  比对过程是深度遍历，先遍历父亲 在遍历孩子 从父-> 子 都要比对一遍
    // 目前没有优化比对，没有关心 只比对变化的部分 blockTree patchFlags
    // 同级比对 父和父比  子和子比  孙子和孙子比  采用的是深度遍历
    let i = 0; // 默认从0 开始比对

    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // i = 0, e1 = 2 , e2 = 3

    // a b c   e d
    // a b    e d
    // 从头开始比较
    while (i <= e1 && i <= e2) {
      // 并且是一方不成功就是false
      const n1 = c1[i];
      const n2 = c2[i];

      if (isSameVNode(n1, n2)) {
        patch(n1, n2, el); // 深度遍历
      } else {
        break;
      }
      i++;
    }
    // i = 2, e1 = 3 , e2 = 4
    // 从尾部开始进行比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, el); // 深度遍历
      } else {
        break;
      }
      e1--;
      e2--;
    }
    // a b
    // a b c d   i = 2  e1 = 1  e2 =3

    //    a b
    //d c a b    i = 0   e1= -1 e2 = 1

    // 我要知道 我是添加还是删除 ？ i 比 e1 大说明新的长老的短

    // 同序列挂载
    if (i > e1) {
      // 有新增
      if (i <= e2) {
        while (i <= e2) {
          // 看一下 如果e2 往前移动了，那么e2 的下一个值肯定存在，意味着向前插入
          // 如果e2 没有动 那么e2 下一个就是空，意味着是向后插入

          const nextPos = e2 + 1;
          // 保存之前的e2
          // vue2 是看下一个元素存不存在
          // vue3 是看下一个元素的长度 是否越界

          const anchor = nextPos < c2.length ? c2[nextPos].el : null;
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    }
    // a b  c d
    // a b      i = 2  e1 = 3  e2= 1
    //  c d a b
    //      a b   i=0     e1=1   e2=-1
    else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    } else {
      // 什么情况是老的多 新的少

      // --------以上是优化处理--------

      // a b c d e   f g
      // a b e c d h f g

      // s1 -> e1 老的需要更新的
      // s2 -> e2 新的节点

      // c d e
      // e c d h

      let s1 = i; // s1 -> e1
      let s2 = i; // s2 -> e2

      // i =2  e1 =4   e2 = 5

      // 这里我们要复用老节点？  key  vue2 中根据老节点创建的索引表  vue3 中根据新的key 做了一个映射表

      const keyToNewIndexMap = new Map();

      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i];
        keyToNewIndexMap.set(vnode.key, i);
      }
      // 有了新的映射表后，去老的中查找一下，看一下是否存在，如果存在需要复用了

      // a b c d e   f g
      // a b e c d h f g

      // h f
      // d h f
      // c d h f
      // e c d h f
      const toBePatched = e2 - s2 + 1;
      console.log(toBePatched);
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0); // [0,0,0,0]

      for (let i = s1; i <= e1; i++) {
        const child = c1[i];
        let newIndex = keyToNewIndexMap.get(child.key); // 通过老的key 来查找对应的新的索引
        // 如果newIndex有值说明有
        if (newIndex == undefined) {
          // 老的里面有 新的没有
          unmount(child);
        } else {
          // 比对两个属性
          // 如果前后两个能复用，则比较这两个节点
          newIndexToOldMapIndex[newIndex - s2] = i + 1;
          patch(child, c2[newIndex], el); // 这个地方复用了
        }
      }
      // 写到这里 我们已经复用了节点，并且更新了复用节点的属性，差移动操作，和新的里面有老的中没有的操作
      // 如何知道 新的里面有 老的里面没有 （老的没有映射表）

      // [5, 3, 4, 0]  对应的位置就是 老索引+1
      // [0,1,2,3]
      // [1],2
      const seq = getSequence(newIndexToOldMapIndex);
      console.log(
        "🚀 ~ file: renderer.js ~ line 202 ~ patchKeyedChildren ~ newIndexToOldMapIndex",
        newIndexToOldMapIndex
      );
      let j = seq.length - 1; // 获取seq最后的索引

      // a b e c d h f g
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i; // 下一个元素的索引
        const nextChild = c2[nextIndex]; // 先拿到的h
        // 看一下 h 后面是否有值 ，有值就将h 插入到这个元素的前面，没有值就是appendChild
        const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
        console.log(
          "🚀 ~ file: renderer.js ~ line 210 ~ patchKeyedChildren ~ anchor",
          anchor
        );
        // 默认找到f 把 h 插入到f前面
        //   a b [e c d h] f g
        if (newIndexToOldMapIndex[i] == 0) {
          patch(null, nextChild, el, anchor); // 将h插入到 f前面
          // 找到新增的了
          // 创建元素在插入
        } else {
          if (i !== seq[j]) {
            hostInsert(nextChild.el, el, anchor); // insert是移动节点
          } else {
            j--; // 不做移动跳过节点即可
          }
        }
      }
    }
  };
  const patchChildren = (n1, n2, el) => {
    // 比较 两方孩子的差异 更新el中的孩子
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        // 文本内容不相同
        hostSetElementText(el, c2);
      }
    } else {
      // 老儿子是数组, 新的是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // diff算法
          patchKeyedChildren(c1, c2, el);
        } else {
          // 老的是数组  新的不是数组.删除来的
          unmountChildren(c1);
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el);
        }
      }
    }
  };
  const patchElement = (n1, n2) => {
    // 比对n1 和 n2的属性差异
    let el = (n2.el = n1.el);
    const oldProps = n1.props || {};

    const newProps = n2.props || {};

    patchProps(oldProps, newProps, el);

    patchChildren(n1, n2, el);
  };

  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 初次渲染
      mountElement(n2, container, anchor);
    } else {
      // diff算法

      patchElement(n1, n2);
    }
  };

  const processText = (n1,n2,el)=>{
    console.log(n1,n2)
 // children 就是传递的 文本

    if (n1 == null) {
      // 文本创建
      // createText(text) {
      //   return document.createTextNode(text);
      // },
      hostInsert((n2.el = hostCreateText(n2.children)), el);
    } else {
      // 文本更新
      let el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        // 文本有更新
        hostSetText(el, n2.children);
      }
    }
  }

  const processFragment = (n1, n2, el) => {
    if (n1 == null) {
      mountChildren(n2.children, el);
    } else {
      patchKeyedChildren(n1.children, n2.children, el);
    }
  };
  

  const mountComponent =(vnode, container, anchor )=>{
    // type 也许是个 字符串 ，也许是个对象
    const { data = () => ({}), render, props: propsOptions = {} } = vnode.type;
    const state = reactive(data()); // 将数据变成响应式的
    const instance = {
      // 组件的实例
      data: state,
      isMounted: false,
      subTree: null, // 里面的 render 返回的结果
      vnode,
      update: null, // 组件的更新方法 effect.run()
      props: {},
      attrs: {},
      propsOptions,
      proxy: null,
    };
    vnode.component = instance; // 让虚拟节点知道对应的组件是谁
    initProps(instance, vnode.props);

    
    const publicProperties = {
      $attrs: (i) => i.attrs,
      $props: (i) => i.props,
    };
    instance.proxy = new Proxy(instance, {
      get(target, key) {

        let { data, props } = target;

        if (Object.prototype.hasOwnProperty.call(data,key)) {

          return data[key];

        } else if (Object.prototype.hasOwnProperty.call(props,key)) {

          return props[key];

        }

        let getter = publicProperties[key];
        if (getter) {
          return getter(target);
        }
      },
      set(target, key, value) {
        let { data, props } = target;
        if (Object.prototype.hasOwnProperty.call(data,key)) {
          data[key] = value;
        } else if (Object.prototype.hasOwnProperty.call(props,key)) {
          console.log("warn ");
          return false;
        }
        return true;
      },
    });

    const componentFn = () => {
      if (!instance.isMounted) {
        // 稍后组件更新 也会执行此方法
        const subTree = render.call(instance.proxy); // 这里会做依赖收集，数据变化会再次调用effect
        patch(null, subTree, container, anchor);
        instance.subTree = subTree; // 第一次渲染产生的vnode
        instance.isMounted = true;
      } else {
        const subTree = render.call(instance.proxy);
        patch(instance.subTree, subTree, container, anchor);
        instance.subTree = subTree;
      }
    };

    const effect = new ReactiveEffect(componentFn, () => {
      // 我需要做异步更新
      queueJob(instance.update);
    });
    const update = (instance.update = effect.run.bind(effect));
    update(); // 强制更新
  }




 const processComponent = ( n1, n2, container, anchor = null)=>{
  if (n1 == null) {
    // 组件初次渲染
    mountComponent(n2, container, anchor);
  } else {
    // 组件更新  指代的是组件的属性 更新、插槽更新
    let instance = (n2.component = n1.component);
    instance.props.a = n2.props.a;

    // todo...
  }

 }


  const patch = (n1, n2, container, anchor = null) => {
    if (n1 == n2) {
      return; // 无需更新
    }
    // n1 div -》 n2 p

    // 如果  n1 n2 都有值 但是类型不同则删除n1 换n2
    
    if (n1 && !isSameVNode(n1, n2)) {
      unmount(n1); // 删除节点
      n1 = null;
    }
    let { shapeFlag, type } = n2;
    switch (type) {
      case Text:
        // 处理文本
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor);
        }
    }
    // ...
  };
  const unmount = vnode => {
    if(vnode.type == Fragment){
    return  unmountChildren(vnode.children)
    }
    hostRemove(vnode.el)
  };
  const render = (vnode, container) => {
    if (vnode == null) {
      // 卸载：删除节点

      if (container._vnode) {
        // 说明渲染过了，我才需要进行卸载操作
        unmount(container._vnode);
      }
    } else {
      // 初次渲染  更新

      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode; // 第一次渲染保存虚拟节点
  };
  return {
    // createRenderer 可以用户自定义渲染方式
    // createRenderer 返回的render方法 接受参数是虚拟节点和容器
    render,
  };
}
