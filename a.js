const queue = [];
let isFlushing = false;

const resolvePromise = Promise.resolve(); // nextTick

const queueJob = (job) => {
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

let time = 0
function job() {
  ++time;
  console.log(time)
}

function job1() {
  ++time;
  console.log(time)
}

function job2() {
  ++time;
  console.log(time)
}

queueJob(job)
queueJob(job1)
queueJob(job2)


// 批处理  开了一个promiose    queue =》 【job,job,job]
