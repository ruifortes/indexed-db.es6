"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _ReadOnlyCursor2 = require("./ReadOnlyCursor");

var _ReadOnlyCursor3 = _interopRequireDefault(_ReadOnlyCursor2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  cursor: Symbol("cursor"),
  iterationCallback: Symbol("iterationCallback"),
  suboperationCallback: Symbol("suboperationCallback"),
  suboperationPromise: Symbol("suboperationPromise"),
  flags: Symbol("flags")
});

/**
 * Read-write cursor for traversing object stores and indexes and modifying or
 * deleting the records on-the-fly.
 */

var Cursor = function (_ReadOnlyCursor) {
  _inherits(Cursor, _ReadOnlyCursor);

  /**
   * Initializes the cursor.
   *
   * @param {IDBRequest} cursorRequest The IndexedDB native request used to
   *        retrieve the native cursor. The request must already be resolved.
   * @param {function()} iterationCallback The Callback to call when either the
   *        {@code advance} or the {@code continue} method is called. Repeated
   *        calls of this function must not have any effect.
   * @param {function(IDBRequest): PromiseSync} suboperationCallback The
   *        callback to execute when a sub-operation (record modification or
   *        deletion) is requested. The callback returns a synchronous promise
   *        resolved when the provided Indexed DB request is completed.
   */

  function Cursor(cursorRequest, iterationCallback, suboperationCallback) {
    _classCallCheck(this, Cursor);

    /**
     * The native cursor.
     * 
     * @type {IDBCursor}
     */

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Cursor).call(this, cursorRequest, function () {}));

    _this[FIELDS.cursor] = cursorRequest.result;

    /**
     * The Callback to call when either the {@code advance} or the
     * {@code continue} method is called.
     * 
     * @type {function()}
     */
    _this[FIELDS.iterationCallback] = iterationCallback;

    /**
     * The callback to execute when a sub-operation (record modification or
     * deletion) is requested. The callback returns a synchronous promise
     * resolved when the provided Indexed DB request is completed.
     * 
     * @type {function(IDBRequest): PromiseSync}
     */
    _this[FIELDS.suboperationCallback] = suboperationCallback;

    /**
     * Promise that resolves when all pending sub-operations on the current
     * record are completed.
     * 
     * @type {PromiseSync<undefined>
     */
    _this[FIELDS.suboperationPromise] = _PromiseSync2.default.resolve();

    /**
     * Cursor state flags.
     *
     * @type {{hasAdvanced: boolean}}
     */
    _this[FIELDS.flags] = {
      /**
       * Set to {@code true} if this cursor has already been used to retrieve
       * the cursor pointing to the next record.
       *
       * @type {boolean}
       */
      hasAdvanced: false
    };
    return _this;
  }

  /**
   * Sets the record at the current position of this cursor.
   *
   * If the cursor points to a record that has just been deleted, a new record
   * is created.
   * 
   * Calling this method will delay the effect of the {@code advance} and the
   * {@code continue} methods until the operation has been successfully queued.
   *
   * @param {*} record The new record to set at the current position.
   * @return {Promise<(number|string|Date|Array)>} A promise that resolves to
   *         the primary key of the record when the operation has been
   *         successfully queued.
   */

  _createClass(Cursor, [{
    key: "update",
    value: function update(record) {
      if (this[FIELDS.flags].hasAdvanced) {
        throw new Error("This cursor instance has already advanced to another " + "record");
      }

      var request = this[FIELDS.cursor].update(record);
      var operationPromise = this[FIELDS.suboperationCallback](request);
      this[FIELDS.suboperationPromise] = this[FIELDS.suboperationPromise].then(function () {
        return operationPromise;
      });

      return operationPromise;
    }

    /**
     * Deletes the record at the current position of this cursor.
     * 
     * Calling this method will delay the effect of the {@code advance} and the
     * {@code continue} methods until the operation has been successfully queued.
     *
     * @return {Promise<undefined>} A promise that resolves when the record is
     *         deleted.
     */

  }, {
    key: "delete",
    value: function _delete() {
      if (this[FIELDS.flags].hasAdvanced) {
        throw new Error("This cursor instance has already advanced to another " + "record");
      }

      var request = this[FIELDS.cursor].delete();
      var operationPromise = this[FIELDS.suboperationCallback](request);
      this[FIELDS.suboperationPromise] = this[FIELDS.suboperationPromise].then(function () {
        return operationPromise;
      });

      return operationPromise;
    }

    /**
     * Advances the cursor the specified number of records forward.
     *
     * This cursor will remain unchanged after calling this method, the method
     * returns a promise that resolves to a new cursor pointing to the next
     * record.
     *
     * Repeated calls to this method on the same instance, or calling this method
     * after the {@linkcode continue} method has been called, throw an error.
     *
     * @override
     * @param {number=} recordCount The number or records the cursor should
     *        advance, {@code 1} points to the immediate next record in the
     *        sequence of records the cursor traverses.
     * @throw {Error} Thrown if the cursor has already been used to iterate to
     *        the next record.
     */

  }, {
    key: "advance",
    value: function advance() {
      var _this2 = this;

      var recordCount = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

      if (this[FIELDS.flags].hasAdvanced) {
        throw new Error("This cursor instance has already advanced to another " + "record");
      }

      this[FIELDS.flags].hasAdvanced = true;

      this[FIELDS.suboperationPromise].then(function () {
        return _get(Object.getPrototypeOf(Cursor.prototype), "advance", _this2).call(_this2, recordCount);
      });

      this[FIELDS.iterationCallback]();
    }

    /**
     * Continues to cursor, skipping all records until hitting the specified key.
     * If no key is provided, the method traverses to the key to the next key in
     * its direction.
     *
     * This cursor will remain unchanged after calling this method, the method
     * returns a promise that resolves to a new cursor pointing to the next
     * record.
     *
     * Repeated calls to this method on the same instance, or calling this method
     * after the {@linkcode advance} method has been called, throw an error.
     *
     * @param {(undefined|number|string|Date|Array)=} nextKey The next key to
     *        which the cursor should iterate. When set to {@code undefined}, the
     *        cursor will advance to the next record. Defaults to
     *        {@code undefined}.
     * @throw {Error} Thrown if the cursor has already been used to iterate to
     *        the next record.
     */

  }, {
    key: "continue",
    value: function _continue() {
      var _this3 = this;

      var nextKey = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

      if (this[FIELDS.flags].hasAdvanced) {
        throw new Error("This cursor instance has already advanced to another " + "record");
      }

      this[FIELDS.flags].hasAdvanced = true;

      this[FIELDS.suboperationPromise].then(function () {
        return _get(Object.getPrototypeOf(Cursor.prototype), "continue", _this3).call(_this3, nextKey);
      });

      this[FIELDS.iterationCallback]();
    }
  }]);

  return Cursor;
}(_ReadOnlyCursor3.default);

exports.default = Cursor;