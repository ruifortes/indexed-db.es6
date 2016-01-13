"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Enum specifying the possible direction in which a cursor will traverse the
 * keys in its source.
 *
 * @enum {CursorDirection}
 */

var CursorDirection = function () {
  /**
   * Initialized the enum constant.
   * 
   * @param {string} value The name of the enum constant being created.
   */

  function CursorDirection(value) {
    _classCallCheck(this, CursorDirection);

    /**
     * The native value representing this enum constant, equal to the constant
     * name.
     * 
     * @type {string}
     */
    this.value = value;

    Object.freeze(this);
  }

  /**
   * Causes the cursor to be opened at the start of the source. When iterated,
   * the cursor will yield records in monotonically increasing order of keys.
   *
   * @return {CursorDirection} Enum constant for iterating a cursor through
   *         the records in the ascending order of keys.
   */

  _createClass(CursorDirection, null, [{
    key: "NEXT",
    get: function get() {
      return NEXT;
    }

    /**
     * Causes the cursor to be opened at the end of the source. When iterated,
     * the cursor will yield records in monotonically decreasing order of keys.
     *
     * @return {CursorDirection} Enum constant for iterating a cursor through
     *         the records in the descending order of keys.
     */

  }, {
    key: "PREVIOUS",
    get: function get() {
      return PREVIOUS;
    }
  }]);

  return CursorDirection;
}();

/**
 * The enum constant available as {@linkcode CursorDirection.NEXT}.
 * 
 * @type {CursorDirection}
 */

exports.default = CursorDirection;
var NEXT = exports.NEXT = new CursorDirection("NEXT");

/**
 * The enum constant available as {@linkcode CursorDirection.PREVIOUS}.
 * 
 * @type {CursorDirection}
 */
var PREVIOUS = exports.PREVIOUS = new CursorDirection("PREVIOUS");

Object.freeze(CursorDirection);