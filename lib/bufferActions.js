'use strict';

var constants = require('./constants');

module.exports = function bufferActions(cb) {
  var active = true;
  var queue = [];

  return function (next) {
    return function (action) {
      if (!active) return next(action);
      if (action.type === constants.REHYDRATE) {
        active = false;
        var result = next(action);
        queue.forEach(function (queuedAction) {
          return next(queuedAction);
        });
        cb(null, queue);
        return result;
      }
      queue.push(action);
    };
  };
};