"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ReadOnlyIndex2 = require("./ReadOnlyIndex");

var _ReadOnlyIndex3 = _interopRequireDefault(_ReadOnlyIndex2);

var _Cursor = require("./Cursor");

var _Cursor2 = _interopRequireDefault(_Cursor);

var _CursorDirection = require("./CursorDirection");

var _CursorDirection2 = _interopRequireDefault(_CursorDirection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Read-write accessor to an index.
 */

var Index = function (_ReadOnlyIndex) {
  _inherits(Index, _ReadOnlyIndex);

  /**
   * Initializes the read-write index.
   *
   * @param {IDBIndex} storage The native Indexed DB index.
   * @param {function(): ReadOnlyTransaction} transactionFactory A function
   *        that creates and returns a new read-only transaction each time it
   *        is invoked.
   */

  function Index(storage, transactionFactory) {
    _classCallCheck(this, Index);

    var storageFactory = function storageFactory() {
      var transaction = transactionFactory();
      var objectStore = transaction.getObjectStore(storage.objectStore.name);
      return objectStore.index(storage.name);
    };

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Index).call(this, storage, _Cursor2.default, storageFactory));

    Object.freeze(_this);
    return _this;
  }

  /**
   * Opens a read-write cursor that traverses the records of this index,
   * resolving to the traversed records.
   *
   * The returned promise resolves once the record callback does not invoke
   * the {@code continue} nor the {@code advance} method synchronously or the
   * cursor reaches the end of available records.
   *
   * @override
   * @param {?(IDBKeyRange)} keyRange A key range to use to filter the records
   *        by matching the values of their primary keys against this key
   *        range.
   * @param {(CursorDirection|string)} direction The direction in which the
   *        cursor will traverse the records. Use either the
   *        {@code CursorDirection.*} constants, or strings {@code "NEXT"} and
   *        {@code "PREVIOUS"} (or {@code "PREV"} for short). The letter case
   *        used in the strings does not matter.
   * @param {boolean} unique When {@code true}, it cursor will skip over the
   *        records stored with the same index key value.
   * @param {function(ReadOnlyCursor)} recordCallback A callback executed every
   *        time the cursor traverses to a record.
   * @return {PromiseSync<number>} A promise that resolves to the number of
   *         iterations the cursor has made (this may be larger than the number
   *         of records traversed if the index has its {@code multiEntry} flag
   *         set and some records repeatedly appear).
   */

  _createClass(Index, [{
    key: "openCursor",
    value: function openCursor(keyRange, direction, unique, recordCallback) {
      return _get(Object.getPrototypeOf(Index.prototype), "openCursor", this).call(this, keyRange, direction, unique, recordCallback);
    }

    /**
     * Creates a factory function for opening cursors on this storage with the
     * specified configuration for the duration of the current transaction.
     * 
     * @override
     * @param {?(undefined|number|string|Date|Array|IDBKeyRange)=} keyRange A key
     *        range to use to filter the records by matching the values of their
     *        primary keys against this key range.
     * @param {(CursorDirection|string)=} direction The direction in which the
     *        cursor will traverse the records. Use either the
     *        {@code CursorDirection.*} constants, or strings {@code "NEXT"} and
     *        {@code "PREVIOUS"} (or {@code "PREV"} for short). The letter case
     *        used in the strings does not matter.
     * @param {boolean=} unique When {@code true}, it cursor will skip over the
     *        records stored with the same index key value.
     * @return {function(function(Cursor)): PromiseSync<number>} A cursor
     *         factory. The factory accepts a callback to execute on every record
     *         the cursor iterates over. The promise returned by the factory
     *         resolves once the record callback does not invoke the
     *         {@code continue} nor the {@code advance} method synchronously or
     *         the cursor reaches the end of available records.
     */

  }, {
    key: "createCursorFactory",
    value: function createCursorFactory() {
      var keyRange = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];
      var direction = arguments.length <= 1 || arguments[1] === undefined ? _CursorDirection2.default.NEXT : arguments[1];
      var unique = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

      return _get(Object.getPrototypeOf(Index.prototype), "createCursorFactory", this).call(this, keyRange, direction, unique);
    }
  }]);

  return Index;
}(_ReadOnlyIndex3.default);

exports.default = Index;