
var fs = require('fs');
var path = require('path');

var setLockedAttr = function (obj, prop, value, enumerable) {
  Object.defineProperty(obj, prop, {
    configurable: false,
    enumerable: enumerable,
    writable: false,
    value: value
  });
};

function Dir(dirname) {
  setLockedAttr(this, 'path', dirname, true);
  this.skip = ['.DS_Store'];
}

Dir.prototype.join = function (p) {
  return path.join(this.path, p);
};

Dir.prototype.files = function (cb) {
  return this._files(this.path, cb);
};

Dir.prototype._files = function (dirname, cb) {

  var self = this;
  var result = [];
  var pushr = function (r) {
    if (!~self.skip.indexOf(r)) {
      result.push(r);
    }
  };
  var absp = function (p) {
    return path.join(dirname, p);
  };

  fs.readdir(dirname, function (err, list) {
    if (err) { return cb(err); }

    var next;
    (next = function () {
      if (list.length === 0) {
        cb(null, result);
      } else {
        var file = list.shift();
        fs.stat(absp(file), function (err, stats) {
          if (err) { return cb(err); }

          if (stats.isFile()) {

            pushr(file);
            next();

          } else if (stats.isDirectory()) {

            self._files(absp(file), function (err, list) {
              if (err) { return cb(err); }

              list.forEach(function (name) {
                pushr(path.join(file, name));
              });

              next();

            });

          } else {

            next();

          }

        });
      }
    })();

  });

};

module.exports = exports = Dir;
