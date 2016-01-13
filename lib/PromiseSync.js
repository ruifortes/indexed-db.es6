"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Possible states of the promise
 */
var STATE = Object.freeze({
  PENDING: Object.freeze({}),
  RESOLVED: Object.freeze({}),
  REJECTED: Object.freeze({})
});

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  state: Symbol("state"),
  value: Symbol("value"),
  fulfillListeners: Symbol("fulfillListeners"),
  errorListeners: Symbol("errorListeners")
});

/**
 * The {@linkcode PromiseSync} is a synchronous alternative to the Promise/A+
 * API, meaning that all callbacks are executed synchronously.
 * 
 * The synchronous promise is used for in-transaction operations to ensure the
 * following:
 * - It allows safe wrapping of IndexedDB request objects, allowing the
 *   callbacks to request more operations on the transaction without the risk
 *   of the transaction becoming inactive. Promise/A+ callbacks are executed
 *   asynchronously, so the transaction will be marked as inactive before the
 *   {@code then} callback of an Promise/A+-wrapped request would be executed.
 * - Firefox (37, and probably later versions too) does not allow the
 *   Promise/A+ callbacks to request new operations on the transaction even if
 *   the transaction is still alive (it throws an error claiming the
 *   transaction is inactive).
 * 
 * Since safe wrapping of IndexedDB requests is the main use of the
 * {@linkcode PromiseSync} promises, the {@linkcode PromiseSync.resolve()}
 * method can handle {@linkcode IDBRequest} instances as an argument.
 */

var PromiseSync = function () {
  /**
   * Initializes the synchronous promise.
   * 
   * @param {function(function(*), function(Error))} callback The promise
   *        initialization callback.
   */

  function PromiseSync(callback) {
    var _this = this;

    _classCallCheck(this, PromiseSync);

    /**
     * One of the {@code STATE.*} constants representing the current state of
     * this promise.
     * 
     * @type {Object}
     */
    this[FIELDS.state] = STATE.PENDING;

    /**
     * The result value of this promise.
     * 
     * @type {(undefined|*|Error)}
     */
    this[FIELDS.value] = undefined;

    /**
     * Internal listeners used to notify the descending promises when this
     * promise is asynchronously fulfilled.
     * 
     * @type {function()[]}
     */
    this[FIELDS.fulfillListeners] = [];

    /**
     * Internal listeners used to notify the descending promises when this
     * promise is asynchronously rejected.
     * 
     * @type {function()[]}
     */
    this[FIELDS.errorListeners] = [function () {
      if (_this[FIELDS.errorListeners] === 1) {
        console.error("Uncaught (in sync promise)", _this[FIELDS.value]);
      }
    }];

    try {
      callback(function (value) {
        return resolve(_this, STATE.RESOLVED, value);
      }, function (error) {
        return resolve(_this, STATE.REJECTED, error);
      });
    } catch (error) {
      resolve(this, STATE.REJECTED, error);
    }
  }

  /**
   * Registers the provided success and error callbacks on this promise.
   * 
   * If this promise resolves, the success callback will be triggered. The
   * value returned by the success callback will be the value of the promise
   * returned by this method. However, if the value returned by the callback is
   * a {@linkcode PromiseSync} instance, the promise returned by this method
   * will resolve to the result of the promise returned by the callback.
   * Finally, if the callback throws an error, the promise returned by this
   * method will be rejected by the error thrown by the callback.
   * 
   * If this promise rejects, the error callback will be triggered. The error
   * callback affects the resolution/rejection of the promise returned by this
   * method in the same way the success callback does.
   * 
   * @param {function(*): *} onFulfill The success callback.
   * @param {function(Error): *} onError The error callback.
   * @return {PromiseSync} A promise resolved when this promise is resolved and
   *         the return value of the invoked callback is resolved.
   */

  _createClass(PromiseSync, [{
    key: "then",
    value: function then(onFulfill) {
      var _this2 = this;

      var onError = arguments.length <= 1 || arguments[1] === undefined ? undefined : arguments[1];

      var thisPromise = this;

      return new PromiseSync(function (resolve, reject) {
        switch (_this2[FIELDS.state]) {
          case STATE.PENDING:
            _this2[FIELDS.fulfillListeners].push(function () {
              return handleResolution(onFulfill);
            });
            _this2[FIELDS.errorListeners].push(function () {
              return handleResolution(onError);
            });
            break;
          case STATE.RESOLVED:
            handleResolution(onFulfill);
            break;
          case STATE.REJECTED:
            handleResolution(onError);
            break;
        }

        function handleResolution(callback) {
          if (!(callback instanceof Function)) {
            if (thisPromise[FIELDS.state] === STATE.RESOLVED) {
              resolve(thisPromise[FIELDS.value]);
            } else {
              reject(thisPromise[FIELDS.value]);
            }
          }

          try {
            var newValue = callback(thisPromise[FIELDS.value]);
            if (newValue instanceof PromiseSync) {
              newValue.then(function (resultingValue) {
                return resolve(resultingValue);
              }, function (error) {
                return reject(error);
              });
            } else {
              resolve(newValue);
            }
          } catch (error) {
            reject(error);
          }
        }
      });
    }

    /**
     * Returns a new promise that executes the provided callback if this promise
     * gets rejected, passing the error as the argument to the callback.
     * 
     * The returned promise will resolve if this promise resolves.
     * 
     * This method is essentially a shorthand for
     * {@code promise.then(undefined, onError)}.
     * 
     * @param {function(Error): *} onError The callback to execute if this
     *        promise is rejected. The callback may either return a value to
     *        resolve the returned promise, or throw an error to reject it.
     * @return {PromiseSync<*>} A promise resolved when this promise is resolved
     *         or the provided callback returns a value, and rejected if this
     *         promise is rejected and the callback throws an error.
     */

  }, {
    key: "catch",
    value: function _catch(onError) {
      return this.then(undefined, onError);
    }

    /**
     * Converts this promise to a regular Promise/A+ native promise.
     * 
     * @return {Promise<*>} Asynchronous representation of this promise.
     */

  }, {
    key: "toPromise",
    value: function toPromise() {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        _this3.then(resolve, reject);
      });
    }

    /**
     * Creates a new promise that resolves to the provided value.
     * 
     * If the value is a {@linkcode Promise} or a {@linkcode PromiseSync}
     * instance, the returned promise will be resolved when the provided promise
     * is resolved, and rejected if the provided promise is rejected.
     * 
     * If the value is a {@linkcode IDBRequest} instance, the returned promise
     * will resolve when the request's {@code onsuccess} method is triggered, and
     * rejects when the request's {@code onerror} method is triggered. 
     * 
     * Note that the method returns the provided value if the value is a
     * {@linkcode PromiseSync} instance.
     * 
     * Also, if an already completed Indexed DB request is provided, the returned
     * promise will never resolve. The method replaces any value previously set
     * to the request's {@code onsuccess} and {@code onerror} methods.
     * 
     * @param {(Promise<*>|PromiseSync<*>|IDBRequest<*>|*)} value The value to
     *        which the returned promise should be resolved.
     * @return {PromiseSync<*>} A promise that resolves to the provided value, or
     *         the value to which the provided promise or Indexed DB request
     *         resolves.
     */

  }], [{
    key: "resolve",
    value: function resolve(value) {
      if (value instanceof PromiseSync) {
        return value;
      }

      if (value instanceof Promise) {
        return new PromiseSync(function (resolve, reject) {
          value.then(resolve, reject);
        });
      }

      if (value instanceof IDBRequest) {
        return new PromiseSync(function (resolve, reject) {
          value.onsuccess = function () {
            return resolve(value.result);
          };
          value.onerror = function () {
            return reject(value.error);
          };
        });
      }

      return new PromiseSync(function (resolve) {
        resolve(value);
      });
    }

    /**
     * Creates a new promise that is rejected with the provided error.
     * 
     * @param {Error} error The error.
     * @return {PromiseSync} A new promise rejected with the provided error.
     */

  }, {
    key: "reject",
    value: function reject(error) {
      return new PromiseSync(function () {
        throw error;
      });
    }

    /**
     * Returns a new promise that resolves once all the provided promises
     * resolve, or rejects if any of the promises rejects.
     * 
     * The returned promise resolves to an array of values provided by the
     * resolved promises.
     * 
     * @param {(PromiseSync<*>|Promise<*>)[]} promises The promises to resolve.
     * @return {PromiseSync} A promise that resolves when all of the provided
     *         promises resolve.
     */

  }, {
    key: "all",
    value: function all(promises) {
      return new PromiseSync(function (resolve, reject) {
        var state = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          var _loop = function _loop() {
            var promise = _step.value;

            var promiseState = {
              resolved: false,
              result: undefined
            };
            state.push(promiseState);

            promise.then(function (result) {
              promiseState.result = result;
              promiseState.resolved = true;

              checkState();
            });

            promise.catch(function (error) {
              reject(error);
            });
          };

          for (var _iterator = promises[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            _loop();
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        function checkState() {
          if (state.every(function (promiseState) {
            return promiseState.resolved;
          })) {
            resolve(state.map(function (promiseState) {
              return promiseState.result;
            }));
          }
        }
      });
    }

    /**
     * Returns a new promise that resolves to the value or error provided by the
     * promise that resolved as first from the provided promises.
     * 
     * @param {(PromiseSync<*>|Promise<*>)[]} promises The promises that should
     *        race among each other.
     * @return {PromiseSync<*>} A promise resolved when one of the promises
     *         resolves. The promise will resolve to the result of the promise
     *         that resolved as first.
     */

  }, {
    key: "race",
    value: function race(promises) {
      return new PromiseSync(function (resolve, reject) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = promises[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var promise = _step2.value;

            promise.then(resolve, reject);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      });
    }
  }]);

  return PromiseSync;
}();

/**
 * Resolves the provided promise to the specified state and result value. This
 * function has no effect if the provided promise has already been resolved.
 * 
 * @param {PromiseSync} instance The promise to resolve.
 * @param {Object} newState One of the {@code STATE.*} constants representing
 *        the new state of the promise. Must not be {@code STATE.PENDING}.
 * @param {(*|Error)} value The new result value of the promise.
 */

exports.default = PromiseSync;
function resolve(instance, newState, value) {
  if (instance[FIELDS.state] !== STATE.PENDING) {
    return;
  }

  instance[FIELDS.state] = newState;
  instance[FIELDS.value] = value;

  var listeners = undefined;
  if (newState === STATE.RESOLVED) {
    listeners = instance[FIELDS.fulfillListeners];
  } else {
    listeners = instance[FIELDS.errorListeners];
  }

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = listeners[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var listener = _step3.value;

      listener();
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }
}