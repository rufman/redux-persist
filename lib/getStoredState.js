'use strict';

exports.__esModule = true;
exports['default'] = getStoredState;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashForeach = require('lodash.foreach');

var _lodashForeach2 = _interopRequireDefault(_lodashForeach);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _defaultsAsyncLocalStorage = require('./defaults/asyncLocalStorage');

var _defaultsAsyncLocalStorage2 = _interopRequireDefault(_defaultsAsyncLocalStorage);

function getStoredState(config, onComplete) {
  var storage = config.storage || _defaultsAsyncLocalStorage2['default']('local');
  var deserialize = config.deserialize || defaultDeserialize;
  var transforms = config.transforms || [];
  var purgeMode = config.purgeMode || false;

  // Add compatability with Mozilla's LocalForage library
  if ('keys' in storage) {
    storage.getAllKeys = function (cb) {
      return storage.keys(cb);
    };
  }

  var restoredState = {};
  var completionCount = 0;

  storage.getAllKeys(function (err, allKeys) {
    if (err && process.env.NODE_ENV !== 'production') {
      console.warn('Error in storage.getAllKeys');
    }
    var persistKeys = allKeys.filter(function (key) {
      return key.indexOf(_constants2['default'].keyPrefix) === 0;
    }).map(function (key) {
      return key.slice(_constants2['default'].keyPrefix.length);
    });
    var keysToRestore = Array.isArray(purgeMode) ? persistKeys.filter(function (key) {
      return purgeMode.indexOf(key) === -1;
    }) : purgeMode === '*' ? [] : persistKeys;

    var restoreCount = keysToRestore.length;
    if (restoreCount === 0) complete(null, restoredState);
    _lodashForeach2['default'](keysToRestore, function (key) {
      storage.getItem(createStorageKey(key), function (err, serialized) {
        if (err && process.env.NODE_ENV !== 'production') console.warn('Error restoring data for key:', key, err);else restoredState[key] = rehydrate(key, serialized);
        completionCount += 1;
        if (completionCount === restoreCount) complete(null, restoredState);
      });
    });
  });

  function rehydrate(key, serialized) {
    var state = null;

    try {
      var data = deserialize(serialized);
      state = transforms.reduceRight(function (subState, transformer) {
        return transformer.out(subState);
      }, data);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('Error restoring data for key:', key, err);
    }

    return state;
  }

  function complete(err, restoredState) {
    onComplete(err, restoredState);
  }
}

function defaultDeserialize(serial) {
  return JSON.parse(serial);
}

function createStorageKey(key) {
  return _constants2['default'].keyPrefix + key;
}
module.exports = exports['default'];