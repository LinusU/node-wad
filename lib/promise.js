
if (setImmediate === undefined) {
  var setImmediate = process.nextTick;
}

function Promise() {
  this.data = null;
  this.queue = [];
  this.cb = (function (err, data) {
    if (err) {
      this.reject(err);
    } else {
      this.resolve(data);
    }
  }).bind(this);
}

Promise.prototype.then = function (cb) {
  if (this.data === null) {
    this.queue.push(cb);
  } else {
    setImmediate((function () {
      cb(this.data[0], this.data[1]);
    }).bind(this));
  }
};

Promise.prototype.reject = function (err) {
  this.data = [err, undefined];
  this.queue.forEach(function (fn) { fn(err); });
  this.queue = null;
};

Promise.prototype.resolve = function (data) {
  this.data = [null, data];
  this.queue.forEach(function (fn) { fn(null, data); });
  this.queue = null;
};

module.exports = exports = Promise;
