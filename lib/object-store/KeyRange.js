"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.range = range;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * An alternative to using the {@linkcode IDBKeyRange} native class directly or
 * a viable option if the documentation is needed at hand.
 *
 * The {@linkcode KeyRange} class is used to construct {@linkcode IDBKeyRange}
 * instances. The {@linkcode IDBKeyRange} instances are used to represent the
 * ranges of values used to filter the records when traversing an object store
 * or an index.
 */

var KeyRange = function () {
  /**
   * Throws an error, because the {@linkcode KeyRange} class is static.
   */

  function KeyRange() {
    _classCallCheck(this, KeyRange);

    throw new Error("The KeyRange class is static, no instances can be " + "created");
  }

  /**
   * Converts the provided array into a key range. The following array
   * structures are supported:
   *
   * - {@code (undefined|null), key value, (optional) open range: boolean} will
   *   be converted to an upper-bound key range with the specified key value as
   *   the upper bound.
   * - {@code (optional) open range: boolean, key value, (undefined|null)} will
   *   be converted to a lower-bound key range with the specified key value as
   *   the lower bound.
   * - {@code (optional) lower open: boolean, lower bound, upper bound,
   *   (optional) upper open: boolean} will be converted to a bound key range
   *   with the specified lower and upper bound.
   *
   * A key value / range bound must always be a {@code number}, {@code string},
   * {@code Date} or an {@code Array} of valid key value (therefore a valid
   * IndexedDB key).
   *
   * To create a single-value key range, use the {@linkcode only} method.
   *
   * @param {...(boolean|null|undefined|number|string|Date|Array)} rangeSpec
   *        The array representing the key range to generate.
   * @return {IDBKeyRange} The created IndexedDB key range.
   * @throws {Error} Thrown if the range array is invalid.
   */

  _createClass(KeyRange, null, [{
    key: "from",
    value: function from() {
      var lowerOpenSpecified = true;
      var upperOpenSpecified = true;

      for (var _len = arguments.length, rangeSpec = Array(_len), _key = 0; _key < _len; _key++) {
        rangeSpec[_key] = arguments[_key];
      }

      if (typeof rangeSpec[0] !== "boolean") {
        rangeSpec.unshift(false);
        lowerOpenSpecified = false;
      }
      if (typeof rangeSpec[rangeSpec.length - 1] !== "boolean") {
        rangeSpec.push(false);
        upperOpenSpecified = false;
      }

      if (rangeSpec.length !== 4) {
        throw new Error("Invalid range array, " + rangeSpec + " was provided");
      }

      for (var i = 1; i < 3; i++) {
        if (rangeSpec[i] === null) {
          rangeSpec[i] = undefined;
        }
      }

      if (rangeSpec[1] === undefined && !lowerOpenSpecified) {
        return KeyRange.upperBound(rangeSpec[2], rangeSpec[3]);
      }

      if (rangeSpec[2] === undefined && !upperOpenSpecified) {
        return KeyRange.lowerBound(rangeSpec[1], rangeSpec[0]);
      }

      if (rangeSpec.slice(1, 3).every(function (value) {
        return value === undefined;
      })) {
        throw new Error("Invalid range array, " + rangeArray + " was provided");
      }

      return KeyRange.bound(rangeSpec[1], rangeSpec[2], rangeSpec[0], rangeSpec[3]);
    }

    /**
     * Creates a new key range matching value greater than (or, if specified,
     * equal to) the specified lower bound, and lower than (or, if specified,
     * equal to) the specified upper bound.
     *
     * @param {(number|string|Date|Array)} lower The lower bound. Must be a valid
     *        key.
     * @param {(number|string|Date|Array)} upper The upper bound. Must be a valid
     *        key.
     * @param {boolean=} lowerOpen If {@code true}, the lower bound will not be
     *        matched by the created key range. Defaults to {@code false}.
     * @param {boolean=} upperOpen If {@code true}, the upper bound will not be
     *        matched by the created key range. Defaults to {@code false}.
     */

  }, {
    key: "bound",
    value: function bound(lower, upper) {
      var lowerOpen = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];
      var upperOpen = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

      return IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
    }

    /**
     * Creates a new key range matching values greater than (or, if specified,
     * equal to) the specified value.
     *
     * @param {(number|string|Date|Array)} bound The value to match. Must be a
     *        valid key.
     * @param {boolean=} open If {@code true}, the value will not be matched by
     *        the created key range. Defaults to {@code false}.
     * @return {IDBKeyRange} The created key range.
     */

  }, {
    key: "lowerBound",
    value: function lowerBound(bound) {
      var open = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return IDBKeyRange.lowerBound(bound, open);
    }

    /**
     * Creates a new key range matching values lower than (or, if specified,
     * equal to) the specified value.
     *
     * @param {(number|string|Date|Array)} bound The value to match. Must be a
     *        valid key.
     * @param {boolean=} open If {@code true}, the value will not be matched by
     *        the created key range. Defaults to {@code false}.
     * @return {IDBKeyRange} The created key range.
     */

  }, {
    key: "upperBound",
    value: function upperBound(bound) {
      var open = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return IDBKeyRange.upperBound(bound, open);
    }

    /**
     * Creates a new key range matching a single key value.
     *
     * @param {(number|string|Date|Array)} expectedValue The value to match. Must
     *        be a valid key.
     * @return {IDBKeyRange} The created key range.
     */

  }, {
    key: "only",
    value: function only(expectedValue) {
      return IDBKeyRange.only(expectedValue);
    }
  }]);

  return KeyRange;
}();

/**
 * A short-hand for {@code KeyRange.from()}, converts the provided array into a
 * key range. The following array structures are supported:
 *
 * - {@code (undefined|null), key value, (optional) open range: boolean} will
 *   be converted to an upper-bound key range with the specified key value as
 *   the upper bound.
 * - {@code (optional) open range: boolean, key value, (undefined|null)} will
 *   be converted to a lower-bound key range with the specified key value as
 *   the lower bound.
 * - {@code (optional) lower open: boolean, lower bound, upper bound,
   *   (optional) upper open: boolean} will be converted to a bound key range
 *   with the specified lower and upper bound.
 *
 * A key value / range bound must always be a {@code number}, {@code string},
 * {@code Date} or an {@code Array} of valid key value (therefore a valid
 * IndexedDB key).
 *
 * To create a single-value key range, use the {@linkcode KeyRange.only}
 * method.
 *
 * @param {...(boolean|null|undefined|number|string|Date|Array)} rangeSpec
 *        The array representing the key range to generate.
 * @return {IDBKeyRange} The created IndexedDB key range.
 * @throws {Error} Thrown if the range array is invalid.
 */

exports.default = KeyRange;
function range() {
  return KeyRange.from.apply(KeyRange, arguments);
}