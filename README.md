# node-wad

Manipulate rock raiders WAD files with ease.

## Command line utility

### Installation

```sh
npm install -g wad
```

### Extracting

```sh
wad -x LegoRR0.wad -o LegoRR0
```

### Compressing

```sh
wad -c LegoRR1 -o LegoRR1.wad
```

## Node.js library

### Installation

```sh
npm install wad
```

### Usage

```javascript
var WAD = require('wad');
```

### Getting an instance

#### `WAD.load(path, cb)`

Load an WAD archive into an `WAD` instance.

- `path`: Path to a WAD archive
- `cb`: Callback that gets called with `err` and `wad`

#### `new WAD()`

Create a new, empty, `WAD` instance.

### Using an instance

#### `.add(path, data)`

Adds an object to the archive.

- `path`: The internal path (e.g. `Languages/ObjectiveText.txt`)
- `data`: Description on how to acquire the data

The `data` parameter currently only accepts this syntax:

```javascript
{
  type: 'file',
  path: 'mods/Lego.cfg'
}
```

#### `.forEach(fn)`

Runs `fn` on every object in the archive.

- `fn`: Function that gets called for every object

The objects that gets passed to `fn` currently has the following attributes:

- `.path`: The internal path
- `.data(cb)`: Fetch the data as a buffer

#### `.save(path, cb)`

Saves the archive to a WAD file.

- `path`: The output path
- `cb`: Callbacks that gets called with `err` and `bytesWritten`

`bytesWritten` is the final size of the archive.
