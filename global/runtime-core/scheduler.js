const queue = [];
let isFlushing = false;

let time = 0
const job = function (){
  console.log(time++)
}

const job2 = function (){
  console.log(time++)
}

const job3 = function (){
  console.log(time++)
}

const resolvePromise = Promise.resolve(); // nextTick

export const queueJob = (job) => {
  if (!queue.includes(job)) {
    queue.push(job);
  }

  // 最终我要清空队列

  if (!isFlushing) {
    isFlushing = true;

    // 等待数据全部修改后 做一次操作
    resolvePromise.then(() => {
      isFlushing = false;
      let copy = queue.slice(0);
      queue.length = 0;

      for (let i = 0; i < copy.length; i++) {
        const job = copy[i];
        job();
      }
    });
  }
};

// 批处理  开了一个promiose    queue =》 【job,job,job]
queueJob(job)
time++
console.log(time,"time")
queueJob(job2)
time++
console.log(time,"time")
queueJob(job3)