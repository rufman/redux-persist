'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports['default'] = persistStore;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashForeach = require('lodash.foreach');

var _lodashForeach2 = _interopRequireDefault(_lodashForeach);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _defaultsAsyncLocalStorage = require('./defaults/asyncLocalStorage');

var _defaultsAsyncLocalStorage2 = _interopRequireDefault(_defaultsAsyncLocalStorage);

var _getStoredState = require('./getStoredState');

var _getStoredState2 = _interopRequireDefault(_getStoredState);

var genericSetImmediate = typeof setImmediate === 'undefined' ? global.setImmediate : setImmediate;

function persistStore(store, config, onComplete) {
  if (config === undefined) config = {};

  // defaults
  var blacklist = config.blacklist || [];
  var whitelist = config.whitelist || false;
  var serialize = config.serialize || defaultSerialize;
  var deserialize = config.deserialize || defaultDeserialize;
  var transforms = config.transforms || [];
  var stateTransforms = config.stateTransforms || [];
  var storage = config.storage || _defaultsAsyncLocalStorage2['default']('local');
  var debounce = config.debounce || false;
  var shouldRestore = !config.skipRestore;

  // Add compatability with Mozilla's LocalForage library
  if ('keys' in storage) {
    storage.getAllKeys = function (cb) {
      return storage.keys(cb);
    };
  }

  // initialize values
  var timeIterator = null;
  var lastState = store.getState();
  var purgeMode = false;
  var storesToProcess = [];

  // restore
  if (shouldRestore) {
    genericSetImmediate(function () {
      _getStoredState2['default'](_extends({}, config, { purgeMode: purgeMode }), function (err, restoredState) {
        if (err && process.env.NODE_ENV !== 'production') console.warn('Error in getStoredState', err);
        store.dispatch(rehydrateAction(restoredState));
        onComplete && onComplete(null, restoredState);
      });
    });
  } else onComplete && genericSetImmediate(onComplete);

  // store
  store.subscribe(function () {
    if (timeIterator !== null) clearInterval(timeIterator);

    var state = stateTransforms.reduce(function (unprocessedState, transformer) {
      return transformer(unprocessedState);
    }, store.getState());
    _lodashForeach2['default'](state, function (subState, key) {
      if (whitelistBlacklistCheck(key)) return;
      if (lastState[key] === state[key]) return;

      storesToProcess.push(key);
    });

    // time iterator (read: debounce)
    timeIterator = setInterval(function () {
      if (storesToProcess.length === 0) {
        clearInterval(timeIterator);
        return;
      }

      var key = createStorageKey(storesToProcess[0]);
      var endState = transforms.reduce(function (subState, transformer) {
        return transformer['in'](subState);
      }, state[storesToProcess[0]]);
      if (typeof endState !== 'undefined') storage.setItem(key, serialize(endState), warnIfSetError(key));
      storesToProcess.shift();
    }, debounce);

    lastState = state;
  });

  function whitelistBlacklistCheck(key) {
    if (whitelist && whitelist.indexOf(key) === -1) return true;
    if (blacklist.indexOf(key) !== -1) return true;
    return false;
  }

  function adhocRehydrate(serialized, cb) {
    var state = null;

    try {
      var data = deserialize(serialized);
      state = transforms.reduceRight(function (interState, transformer) {
        return transformer.out(interState);
      }, data);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('Error rehydrating data:', serialized, err);
    }

    store.dispatch(rehydrateAction(state));
    cb && cb(null, state);
  }

  function purge(keys) {
    purgeMode = keys;
    _lodashForeach2['default'](keys, function (key) {
      storage.removeItem(createStorageKey(key), warnIfRemoveError(key));
    });
  }

  function purgeAll() {
    purgeMode = '*';
    storage.getAllKeys(function (err, allKeys) {
      if (err && process.env.NODE_ENV !== 'production') {
        console.warn('Error in storage.getAllKeys');
      }
      purge(allKeys.filter(function (key) {
        return key.indexOf(_constants2['default'].keyPrefix) === 0;
      }).map(function (key) {
        return key.slice(_constants2['default'].keyPrefix.length);
      }));
    });
  }

  // return `persistor`
  return {
    rehydrate: adhocRehydrate,
    purge: purge,
    purgeAll: purgeAll
  };
}

function warnIfRemoveError(key) {
  return function removeError(err) {
    if (err && process.env.NODE_ENV !== 'production') {
      console.warn('Error storing data for key:', key, err);
    }
  };
}

function warnIfSetError(key) {
  return function setError(err) {
    if (err && process.env.NODE_ENV !== 'production') {
      console.warn('Error storing data for key:', key, err);
    }
  };
}

function createStorageKey(key) {
  return _constants2['default'].keyPrefix + key;
}

function rehydrateAction(data) {
  return {
    type: _constants2['default'].REHYDRATE,
    payload: data
  };
}

function defaultSerialize(data) {
  return JSON.stringify(data);
}

function defaultDeserialize(serial) {
  return JSON.parse(serial);
}
module.exports = exports['default'];