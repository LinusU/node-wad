
var fs = require('fs');
var Promise = require('./promise');

if (setImmediate === undefined) {
  var setImmediate = process.nextTick;
}

var setLockedAttr = function (obj, prop, value, enumerable) {
  Object.defineProperty(obj, prop, {
    configurable: false,
    enumerable: enumerable,
    writable: false,
    value: value
  });
};

function BinFile(path, mode) {
  setLockedAttr(this, 'path', path, true);
  setLockedAttr(this, 'mode', mode, true);
  setLockedAttr(this, '_p', new Promise(), false);
  this._pos = 0;
  this._size = 0;
  if (this.mode === 'buffer') {
    fs.readFile(this.path, (function (err, b) {
      if (err) {
        this._p.reject(err);
      } else {
        this._size = b.length;
        this._p.resolve(b);
      }
    }).bind(this));
  } else if (this.mode === 'fd') {
    fs.stat(this.path, (function (err, stats) {
      if (err) {
        this._p.reject(err);
      } else {
        this._size = stats.size;
        fs.open(this.path, 'r', this._p.cb);
      }
    }).bind(this));
  } else {
    throw new Error('Mode not implemented: ' + this.mode);
  }
};

BinFile.prototype.seek = function (position) {
  this._pos = Math.min(this._size, position);
};

BinFile.prototype.tell = function () {
  return this._pos;
};

BinFile.prototype.read = function (length, cb) {

  var position = this._pos;
  this._pos += length;

  return this.readAt(position, length, cb);
};

BinFile.prototype.readAt = function (position, length, cb) {
  this._p.then((function (err, data) {
    if (err) { return cb(err); }

    if (this.mode === 'buffer') {
      var slice = null;
      try {
        slice = data.slice(position, position + length);
      } catch (err) {
        cb(err);
      }
      if (slice !== null) {
        cb(null, slice);
      }
    }

    if (this.mode === 'fd') {
      var b = new Buffer(length);
      fs.read(data, b, 0, length, position, function (err, bytesRead) {
        if (err) {
          cb(err);
        } else if (bytesRead !== length) {
          cb(new Error('Error reading from file'));
        } else {
          cb(null, b);
        }
      });
    }

  }).bind(this));
};

BinFile.prototype.isEOF = function (cb) {
  return (this._pos >= this._size);
};

BinFile.prototype.bytesLeft = function (cb) {
  return (this._size - this._pos);
}

BinFile.prototype.readCString = function (cb) {
  return this.readCStrings(1, cb);
};

BinFile.prototype.readCStrings = function (count, cb) {
  this._p.then((function (err, data) {
    if (err) { return cb(err); }

    var str = [];
    var res = [];

    var readNextChunk = (function () {

      if (this.isEOF()) {
        cb(new Error('EOF reached prematurely'));
        return ;
      }

      var l = Math.min(1024, this.bytesLeft());

      this.readAt(this._pos, l, (function (err, b) {
        if (err) { return cb(err); }

        for(var i=0; i<l; i++) {
          this._pos += 1;
          if (b[i] === 0) {
            res.push((new Buffer(str)).toString());
            str = [];
            if (res.length === count) {
              cb(null, res);
              return ;
            }
          } else {
            str.push(b[i]);
          }
        }

        setImmediate(readNextChunk);

      }).bind(this));

    }).bind(this);

    readNextChunk();

  }).bind(this));
};

BinFile.prototype.free = function (cb) {
  this._p.then(function (err, data) {
    if (err) { return cb(err); }

    if (this.mode === 'buffer') {
      cb(null);
    }

    if (this.mode === 'fd') {
      fs.close(data, cb);
    }

  });
};

module.exports = exports = BinFile;
