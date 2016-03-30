'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashIsplainobject = require('lodash.isplainobject');

var _lodashIsplainobject2 = _interopRequireDefault(_lodashIsplainobject);

var _bufferActions = require('./bufferActions');

var _bufferActions2 = _interopRequireDefault(_bufferActions);

var _constants = require('./constants');

module.exports = function autoRehydrate() {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return function (next) {
    return function (reducer, initialState, enhancer) {
      var rehydrationReducer = createRehydrationReducer(reducer, config.stateSetter);

      // buffer actions
      var store = next(rehydrationReducer, initialState, enhancer);
      var dispatch = _bufferActions2['default'](onBufferEnd)(store.dispatch);

      return _extends({}, store, {
        dispatch: dispatch
      });
    };
  };

  function onBufferEnd(err, queue) {
    if (err) console.error(err);
    if (config.log) console.log('redux-persist/autoRehydrate action buffer released', queue);
  }

  function createRehydrationReducer(reducer, stateSetter) {
    return function (state, action) {
      if (action.type !== _constants.REHYDRATE) return reducer(state, action);else {
        var _ret = (function () {
          var inboundState = action.payload;
          var reducedState = reducer(state, action);
          var newState = stateSetter ? reducedState : _extends({}, reducedState);

          Object.keys(inboundState).forEach(function (key) {
            // if reducer modifies substate, skip auto rehydration
            if (state[key] !== reducedState[key]) {
              if (config.log) console.log('redux-persist/autoRehydrate sub state for key "%s" modified, skipping autoRehydrate', key);
              stateSetter ? stateSetter(newState, key, reducedState[key]) : newState[key] = reducedState[key];
              return;
            }

            // otherwise take the inboundState
            if (checkIfPlain(inboundState[key], reducedState[key])) newState[key] = _extends({}, state[key], inboundState[key]); // shallow merge
            else stateSetter ? newState = stateSetter(newState, key, inboundState[key]) : newState[key] = inboundState[key]; // hard set

            if (config.log) console.log('redux-persist/autoRehydrate key: %s, rehydrated to:', key, newState[key]);
          });
          return {
            v: newState
          };
        })();

        if (typeof _ret === 'object') return _ret.v;
      }
    };
  }
};

function checkIfPlain(a, b) {
  // isPlainObject + duck type not immutable
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (typeof a.mergeDeep === 'function' || typeof b.mergeDeep === 'function') return false;
  if (!_lodashIsplainobject2['default'](a) || !_lodashIsplainobject2['default'](b)) return false;
  return true;
}