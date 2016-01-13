"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _CursorDirection = require("./CursorDirection");

var _CursorDirection2 = _interopRequireDefault(_CursorDirection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
 * Common base class providing the basic read-only functionality of object
 * stores and indexes.
 *
 * @abstract
 */

var AbstractBaseStorage = function () {
  /**
   * Initializes the storage. The overriding implementation should freeze the
   * instance object once it is fully initialized.
   *
   * @param {(IDBObjectStore|IDBIndex)} storage The native Indexed DB object
   *        store or index.
   * @param {function(new: ReadOnlyCursor, IDBRequest, function(), function(IDBRequest): PromiseSync)} cursorConstructor
   *        Constructor of the cursor to use when traversing the storage
   *        records.
   */

  function AbstractBaseStorage(storage, cursorConstructor) {
    _classCallCheck(this, AbstractBaseStorage);

    if (this.constructor === AbstractBaseStorage) {
      throw new Error("THe AbstractBaseStorage class is abstract and must " + "be overridden");
    }

    var keyPath = storage.keyPath;
    if (keyPath && typeof keyPath !== "string") {
      keyPath = Object.freeze(Array.from(keyPath));
    }

    /**
     * The key path of this object store or index, specified as a sequence of
     * field names joined by dots (if the object store uses in-line keys), or
     * an array of field names if the object store uses a compound key, or
     * {@code null} if this is an object store that uses out-of-line keys.
     *
     * @type {?(string|string[])}
     */
    this.keyPath = keyPath || null;

    /**
     * The name of this object store.
     *
     * @type {string}
     */
    this.name = storage.name;

    /**
     * The native IndexedDB storage access object - an object store or an
     * index.
     *
     * @type {(IDBObjectStore|IDBIndex)}
     */
    this[FIELDS.storage] = storage;

    /**
     * The constructor function of the cursor to use to create cursor
     * instances.
     *
     * @type {function(new: ReadOnlyCursor, IDBRequest, function(), function(IDBRequest): PromiseSync)}
     */
    this[FIELDS.cursorConstructor] = cursorConstructor;
  }

  /**
   * Retrieves a single record identified by the specified key value.
   *
   * If the key is an {@linkcode IDBKeyRange} instance, or the key value
   * matches multiple records, the method retrieves the first record matching
   * the key / key range.
   *
   * There are the following ways of specifying a compound key:
   * - An array of primary key field values. The values must be specified in
   *   the same order as the key paths of this object store.
   * - An {@code Object<string, (number|string|Date|Array)>} object specifying
   *   only the primary key field values.
   *
   * @param {(number|string|Date|Array|Object|IDBKeyRange)} key The key value
   *        identifying the record.
   * @return {PromiseSync<*>} A promise that resolves to the record, or
   *         {@code undefined} if the record does not exist. The also promise
   *         resolves to {@code undefined} if the record exists, but it is the
   *         {@code undefined} value.
   */

  _createClass(AbstractBaseStorage, [{
    key: "get",
    value: function get(key) {
      var isCompoundKeyObject = key instanceof Object && !(key instanceof Date) && !(key instanceof IDBKeyRange);
      if (isCompoundKeyObject) {
        if (!(this.keyPath instanceof Array)) {
          throw new Error("This storage does not use a compound key, but one " + "was provided");
        }
        key = normalizeCompoundObjectKey(this.keyPath, key);
      }

      var request = this[FIELDS.storage].get(key);
      return _PromiseSync2.default.resolve(request);
    }

    /**
     * Opens a read-only cursor that traverses the records of this storage,
     * resolving to the traversed records.
     * 
     * The returned promise resolves once the record callback does not invoke
     * the {@code continue} nor the {@code advance} method synchronously or the
     * cursor reaches the end of available records.
     *
     * @param {?(number|string|Date|Array|IDBKeyRange)} keyRange A key range to
     *        use to filter the records by matching the values of their primary
     *        keys against this key range.
     * @param {(CursorDirection|string)} direction The direction in which the
     *        cursor will traverse the records. Use either the
     *        {@code CursorDirection.*} constants, or strings {@code "NEXT"} and
     *        {@code "PREVIOUS"} (or {@code "PREV"} for short). The letter case
     *        used in the strings does not matter.
     * @param {function(ReadOnlyCursor)} recordCallback A callback executed every
     *        time the cursor traverses to a record.
     * @return {PromiseSync<number>} A promise that resolves to the number of
     *         records the cursor traversed.
     */

  }, {
    key: "openCursor",
    value: function openCursor(keyRange, direction, recordCallback) {
      return this.createCursorFactory(keyRange, direction)(recordCallback);
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
      var _this = this;

      var keyRange = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];
      var direction = arguments.length <= 1 || arguments[1] === undefined ? _CursorDirection2.default.NEXT : arguments[1];

      if (keyRange === null) {
        keyRange = undefined;
      }

      var cursorConstructor = this[FIELDS.cursorConstructor];

      if (typeof direction === "string") {
        if (CURSOR_DIRECTIONS.indexOf(direction.toUpperCase()) === -1) {
          throw new Error("When using a string as cursor direction, use NEXT " + ("or PREVIOUS, " + direction + " provided"));
        }
      } else {
        direction = direction.value;
      }

      var cursorDirection = direction.toLowerCase().substring(0, 4);

      return function (recordCallback) {
        var request = _this[FIELDS.storage].openCursor(keyRange, cursorDirection);
        return iterateCursor(request, cursorConstructor, recordCallback);
      };
    }
  }]);

  return AbstractBaseStorage;
}();

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

exports.default = AbstractBaseStorage;
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
        return;
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
 * Normalizes the provided compound key represented as an object into a
 * compound key representation compatible with the Indexed DB.
 *
 * @param {string[]} keyPaths The key paths of this storage.
 * @param {Object} key The compound key to normalize for use with the Indexed
 *        DB.
 * @return {Array<(number|string|Date|Array)>} Normalized compound key.
 */
function normalizeCompoundObjectKey(keyPaths, key) {
  var normalizedKey = [];

  keyPaths.forEach(function (keyPath) {
    var keyValue = key;

    keyPath.split(".").forEach(function (fieldName) {
      if (!keyValue.hasOwnProperty(fieldName)) {
        throw new Error("The " + keyPath + " key path is not defined in the " + "provided compound key");
      }

      keyValue = keyValue[fieldName];
    });

    normalizedKey.push(keyValue);
  });

  return normalizedKey;
}