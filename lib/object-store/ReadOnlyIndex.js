"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _AbstractReadOnlyStorage = require("./AbstractReadOnlyStorage");

var _AbstractReadOnlyStorage2 = _interopRequireDefault(_AbstractReadOnlyStorage);

var _CursorDirection = require("./CursorDirection");

var _CursorDirection2 = _interopRequireDefault(_CursorDirection);

var _ReadOnlyCursor = require("./ReadOnlyCursor");

var _ReadOnlyCursor2 = _interopRequireDefault(_ReadOnlyCursor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Values allowed as cursor directions.
 * 
 * @type {(CursorDirection|string)[]}
 */
var CURSOR_DIRECTIONS = [_CursorDirection2.default.NEXT, _CursorDirection2.default.PREVIOUS, "NEXT", "PREVIOUS", "PREV"];

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  storage: Symbol("storage"),
  cursorConstructor: Symbol("cursorConstructor")
});

/**
 * Read-only accessor for an index.
 */

var ReadOnlyIndex = function (_AbstractReadOnlyStor) {
  _inherits(ReadOnlyIndex, _AbstractReadOnlyStor);

  /**
   * Initializes the read-only index.
   *
   * @param {IDBIndex} storage The native Indexed DB index.
   * @param {function(new: ReadyOnlyCursor)} cursorConstructor Constructor of
   *        the cursor to use when traversing the storage records.
   * @param {function(): ReadOnlyTransaction} transactionFactory A function
   *        that creates and returns a new read-only transaction each time it
   *        is invoked.
   */

  function ReadOnlyIndex(storage, cursorConstructor, transactionFactory) {
    _classCallCheck(this, ReadOnlyIndex);

    var storageFactory = function storageFactory() {
      var transaction = transactionFactory();
      var objectStore = transaction.getStore(storage.objectStore.name);
      return objectStore.index(storage.name);
    };

    /**
     * When {@code true}, and a record's index key path evaluates to an array,
     * the index stores an index key value for each element of the evaluated
     * array.
     *
     * @type {boolean}
     */

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ReadOnlyIndex).call(this, storage, cursorConstructor, storageFactory));

    _this.multiEntry = storage.multiEntry;

    /**
     * When {@code true}, the index enforces that no records may share the same
     * index key value.
     *
     * @type {boolean}
     */
    _this.unique = storage.unique;

    /**
     * The native Indexed DB index.
     *
     * @type {IDBIndex}
     */
    _this[FIELDS.storage] = storage;

    /**
     * The constructor function of the cursor to use to create cursor
     * instances.
     *
     * @type {function(new: ReadyOnlyCursor)}
     */
    _this[FIELDS.cursorConstructor] = cursorConstructor;

    if (_this.constructor === ReadOnlyIndex) {
      Object.freeze(_this);
    }
    return _this;
  }

  /**
   * Retrieves the primary key of the first record matching the specified key
   * value or key range.
   *
   * @param {(number|string|Date|Array|IDBKeyRange)} key The index key or key
   *        range for which a record primary key should be retrieved.
   * @return {PromiseSync<(undefined|number|string|Date|Array)>} A promise that
   *         resolves to the primary key of the first record matching the
   *         specified index key or key range. The promise resolves to
   *         {@code undefined} if no record is found.
   */

  _createClass(ReadOnlyIndex, [{
    key: "getPrimaryKey",
    value: function getPrimaryKey(key) {
      var request = this[FIELDS.storage].getKey(key);
      return _PromiseSync2.default.resolve(request);
    }

    /**
     * Traverses the keys in this index in the ascending order and resolves into
     * the primary keys of all traversed records.
     *
     * @return {PromiseSync<(number|string|Date|Array)[]>} A promise that
     *         resolves to a list of all record primary keys obtained by getting
     *         the primary of records traversed by traversing the key of this
     *         index in the ascending order.
     */

  }, {
    key: "getAllPrimaryKeys",
    value: function getAllPrimaryKeys() {
      var primaryKeys = [];

      return this.openKeyCursor(null, _CursorDirection2.default.NEXT, false, function (cursor) {
        primaryKeys.push(cursor.primaryKey);
        cursor.continue();
      }).then(function () {
        return primaryKeys;
      });
    }

    /**
     * Opens a read-only cursor that traverses the records of this index,
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
     *         records the cursor traversed.
     */

  }, {
    key: "openCursor",
    value: function openCursor(keyRange, direction, unique, recordCallback) {
      var factory = this.createCursorFactory(keyRange, direction, unique);
      return factory(recordCallback);
    }

    /**
     * Opens a read-only cursor that traverses the records of this index,
     * resolving only the primary keys of the records.
     *
     * The returned promise resolves once the record callback does not invoke
     * the {@code continue} nor the {@code advance} method synchronously or the
     * cursor reaches the end of available records.
     *
     * The {@code record} field of the cursor will always be {@code null}.
     *
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

  }, {
    key: "openKeyCursor",
    value: function openKeyCursor(keyRange, direction, unique, recordCallback) {
      var factory = this.createKeyCursorFactory(keyRange, direction, unique);
      return factory(recordCallback);
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
     * @return {function(function(ReadOnlyCursor)): PromiseSync<number>} A cursor
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

      var _this2 = this;

      var direction = arguments.length <= 1 || arguments[1] === undefined ? _CursorDirection2.default.NEXT : arguments[1];
      var unique = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

      if (keyRange === null) {
        keyRange = undefined;
      }

      var cursorConstructor = this[FIELDS.cursorConstructor];
      var cursorDirection = toNativeCursorDirection(direction, unique);

      return function (recordCallback) {
        var request = _this2[FIELDS.storage].openCursor(keyRange, cursorDirection);
        return iterateCursor(request, cursorConstructor, recordCallback);
      };
    }

    /**
     * Creates a factory function for opening cursors on this storage with the
     * specified configuration for the duration of the current transaction.
     * 
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
     * @return {function(function(ReadOnlyCursor)): PromiseSync<number>} A cursor
     *         factory. The factory accepts a callback to execute on every record
     *         the cursor iterates over. The promise returned by the factory
     *         resolves once the record callback does not invoke the
     *         {@code continue} nor the {@code advance} method synchronously or
     *         the cursor reaches the end of available records.
     */

  }, {
    key: "createKeyCursorFactory",
    value: function createKeyCursorFactory() {
      var keyRange = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

      var _this3 = this;

      var direction = arguments.length <= 1 || arguments[1] === undefined ? _CursorDirection2.default.NEXT : arguments[1];
      var unique = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

      if (keyRange === null) {
        keyRange = undefined;
      }

      var cursorDirection = toNativeCursorDirection(direction, unique);

      return function (recordCallback) {
        var request = undefined;
        request = _this3[FIELDS.storage].openKeyCursor(keyRange, cursorDirection);
        return iterateCursor(request, _ReadOnlyCursor2.default, recordCallback);
      };
    }
  }]);

  return ReadOnlyIndex;
}(_AbstractReadOnlyStorage2.default);

/**
 * Iterates the cursor to which the provided Indexed DB request resolves. The
 * method will iterate the cursor over the records in this storage within the
 * range specified when the cursor was opened until the provided callback does
 * not request iterating to the next record or the last matching record is
 * reached.
 * 
 * @param {IDBRequest} request Indexed DB request that resolves to a cursor
 *        every time the cursor iterates to a record.
 * @param {function(new: ReadOnlyCursor, IDBRequest, function(), function(IDBRequest): PromiseSync)} cursorConstructor
 *        Constructor of the cursor class to use to wrap the native IDBRequest
 *        producing the native IndexedDB cursor.
 * @param {function(ReadOnlyCursor)} recordCallback The callback to execute,
 *        passing a high-level cursor instance pointing to the current record
 *        in each iteration of the cursor.
 * @return {PromiseSync<number>} A promise that resolves to the number of
 *         records the cursor traversed.
 */

exports.default = ReadOnlyIndex;
function iterateCursor(request, cursorConstructor, recordCallback) {
  return new _PromiseSync2.default(function (resolve, reject) {
    var traversedRecords = 0;
    var canIterate = true;

    request.onerror = function () {
      return reject(request.error);
    };
    request.onsuccess = function () {
      if (!canIterate) {
        console.warn("Cursor iteration was requested asynchronously, " + "ignoring the new cursor position");
      }

      if (!request.result) {
        resolve(traversedRecords);
        return;
      }

      traversedRecords++;

      var iterationRequested = handleCursorIteration(request, cursorConstructor, recordCallback, reject);

      if (!iterationRequested) {
        canIterate = false;
        resolve(traversedRecords);
      }
    };
  });
}

/**
 * Handles a single iteration of a Indexed DB cursor iterating the records in
 * the storage.
 * 
 * @param {IDBRequest} request Indexed DB request resolved to a cursor.
 * @param {function(new: ReadOnlyCursor, IDBRequest, function(), function(IDBRequest): PromiseSync)} cursorConstructor
 *        Constructor of the high-level cursor implementation to use.
 * @param {function(ReadOnlyCursor)} recordCallback The callback to execute,
 *        passing a high-level cursor instance pointing to the current record.
 * @param {function(Error)} reject Callback to call if any sub-operation
 *        triggered by the callback results in an error.
 * @return {boolean} {@code true} if the cursor should iterate to the next
 *         record.
 */
function handleCursorIteration(request, cursorConstructor, recordCallback, reject) {
  var iterationRequested = false;
  var cursor = new cursorConstructor(request, function () {
    iterationRequested = true;
  }, function (subRequest) {
    return _PromiseSync2.default.resolve(subRequest).catch(function (error) {
      reject(error);
      throw error;
    });
  });

  try {
    recordCallback(cursor);
  } catch (error) {
    iterationRequested = false;
    reject(error);
  }

  return iterationRequested;
}

/**
 * Returns the cursor direction to use with the native Indexed DB API.
 * 
 * @param {(CursorDirection|string)=} direction The direction in which the
 *        cursor will traverse the records. Use either the
 *        {@code CursorDirection.*} constants, or strings {@code "NEXT"} and
 *        {@code "PREVIOUS"} (or {@code "PREV"} for short). The letter case
 *        used in the strings does not matter.
 * @param {boolean=} unique When {@code true}, it cursor will skip over the
 *        records stored with the same index key value.
 * @return {string} The cursor direction compatible with the native Indexed DB
 *         API.
 */
function toNativeCursorDirection(direction, unique) {
  if (typeof direction === "string") {
    if (CURSOR_DIRECTIONS.indexOf(direction.toUpperCase()) === -1) {
      throw new Error("When using a string as cursor direction, use NEXT " + ("or PREVIOUS, " + direction + " provided"));
    }
  } else {
    direction = direction.value;
  }

  var cursorDirection = direction.toLowerCase().substring(0, 4);
  if (unique) {
    cursorDirection += "unique";
  }

  return cursorDirection;
}