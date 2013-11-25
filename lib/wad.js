
var fs = require('fs');
var BinFile = require('./binfile');

var setLockedAttr = function (obj, prop, value, enumerable) {
  Object.defineProperty(obj, prop, {
    configurable: false,
    enumerable: enumerable,
    writable: false,
    value: value
  });
};

function WADObject (path, data) {
  setLockedAttr(this, 'path', path, true)
  setLockedAttr(this, 'data', function (cb) {
    switch (data.type) {
      case 'file':
        fs.readFile(data.path, cb);
        break;
      case 'binfile':
        data.file.readAt(data.pos, data.size, cb);
        break;
      default:
        throw new Error('Unknown data type');
    }
  }, true);
}

function WAD () {
  this._objects = [];
}

WAD.prototype.add = function (path, data) {
  this._objects.push(new WADObject(path, data));
};

WAD.prototype.forEach = function (fn) {
  return this._objects.forEach(fn);
};

WAD.prototype.save = function (path, cb) {

  var stream = fs.createWriteStream(path);

  stream.on('error', function (err) { cb(err); });

  var pos = 0;
  var write = function (v) {
    pos += v.length;
    return stream.write(v, 'binary');
  };
  var writeUInt32LE = function (value) {
    var buf = new Buffer(4 * arguments.length);
    for (var i=0; i<arguments.length; i++) {
      buf.writeUInt32LE(arguments[i], 4 * i);
    }
    write(buf);
  };

  write('WWAD');
  writeUInt32LE(this._objects.length);

  this._objects.forEach(function (obj) {
    write(obj.path.replace(/\//g, '\\') + '\0');
  });

  this._objects.forEach(function (obj) {
    write('\\\\ROBW\\C\\' + obj.path.replace(/\//g, '\\') + '\0');
  });

  var attrPos = pos;
  var headerSize = pos + (16 * this._objects.length);
  var attrBuffer = new Buffer(16 * this._objects.length);

  attrBuffer.fill(0);
  write(attrBuffer);

  var next, objs = this._objects;
  (next = function (i, cb) {

    if (i === objs.length) {
      cb(null);
    } else {
      objs[i].data(function (err, data) {
        if (err) { return cb(err); }

        attrBuffer.writeUInt32LE(1, i * 16 + 4 * 0);
        attrBuffer.writeUInt32LE(data.length, i * 16 + 4 * 1);
        attrBuffer.writeUInt32LE(data.length, i * 16 + 4 * 2);
        attrBuffer.writeUInt32LE(pos, i * 16 + 4 * 3);

        if (write(data) === false) {
          stream.once('drain', function () {
            next(i + 1, cb);
          });
        } else {
          next(i + 1, cb);
        }

      });
    }

  })(0, function (err) {
    if (err) { return cb(err); }

    stream.end(function () {

      fs.open(path, 'r+', function (err, fd) {
        if (err) { return cb(err); }

        fs.write(fd, attrBuffer, 0, attrBuffer.length, attrPos, function (err) {
          if (err) { return cb(err); }

          fs.close(fd, function (err) {
            cb(err, ( err ? undefined : pos ));
          });

        });

      });

    });

  });

};

WAD.load = function (path, cb) {

  var file = new BinFile(path, 'buffer');

  file.read(8, function (err, b) {
    if (err) { return cb(err); }

    if (b.toString('ascii', 0, 4) !== 'WWAD') {
      return cb(new Error('Not a WAD file'));
    }

    var objCount = b.readUInt32LE(4);

    file.readCStrings(objCount, function (err, res) {
      if (err) { return cb(err); }

      var paths = res.map(function (e) {
        return e.replace(/\\/g, '/');
      });

      file.readCStrings(objCount, function (err, res) {
        if (err) { return cb(err); }

        file.read(16 * objCount, function (err, res) {

          var wad = new WAD();

          for(var i=0; i<objCount; i++) {

            if(res.readUInt32LE(i * 16 + 4) !== res.readUInt32LE(i * 16 + 8)) {
              throw new Error('The two sizes did not match, new wad feature?');
            }

            wad.add(paths[i], {
              type: 'binfile',
              pos: res.readUInt32LE(i * 16 + 12),
              size: res.readUInt32LE(i * 16 + 4),
              file: file
            });

          }

          cb(null, wad);

        });

      });

    });

  });

};

module.exports = exports = WAD;
