"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _AbstractBaseStorage2 = require("./AbstractBaseStorage");

var _AbstractBaseStorage3 = _interopRequireDefault(_AbstractBaseStorage2);

var _CursorDirection = require("./CursorDirection");

var _CursorDirection2 = _interopRequireDefault(_CursorDirection);

var _KeyRange = require("./KeyRange");

var _KeyRange2 = _interopRequireDefault(_KeyRange);

var _RecordList = require("./RecordList");

var _RecordList2 = _interopRequireDefault(_RecordList);

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  storage: Symbol("storage"),
  unique: Symbol("unique"),
  storageFactory: Symbol("storageFactory")
});

/**
 * Abstract storage accessor providing high-level read-only API.
 *
 * @abstract
 */

var AbstractReadOnlyStorage = function (_AbstractBaseStorage) {
  _inherits(AbstractReadOnlyStorage, _AbstractBaseStorage);

  /**
   * Initializes the read-only storage. The overriding implementation should
   * freeze the instance object once it is fully initialized.
   *
   * @param {(IDBObjectStore|IDBIndex)} storage The native Indexed DB object
   *        store or index.
   * @param {function(new: ReadyOnlyCursor)} cursorConstructor Constructor of
   *        the cursor to use when traversing the storage records.
   * @param {function(): AbstractReadOnlyStorage} storageFactory A function
   *        that creates a new read-only transaction and returns a new storage
   *        accessor for this storage each time it is invoked.
   */

  function AbstractReadOnlyStorage(storage, cursorConstructor, storageFactory) {
    _classCallCheck(this, AbstractReadOnlyStorage);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AbstractReadOnlyStorage).call(this, storage, cursorConstructor));

    if (_this.constructor === AbstractReadOnlyStorage) {
      throw new Error("The AbstractReadOnlyStorage class is abstract and " + "must be overridden");
    }

    /**
     * The native Indexed DB object store or index.
     *
     * @type {(IDBObjectStore|IDBIndex)}
     */
    _this[FIELDS.storage] = storage;

    /**
     * When {@code true}, the keys by which the records are organized in the
     * store are always unique for each record.
     *
     * @type {boolean}
     */
    _this[FIELDS.unique] = storage instanceof IDBObjectStore || storage.unique;

    /**
     * A function that creates a new read-only transaction and returns a new
     * storage accessor for this storage each time it is invoked.
     *
     * @type {function(): AbstractReadOnlyStorage}
     */
    _this[FIELDS.storageFactory] = storageFactory;
    return _this;
  }

  /**
   * Tests whether a record matching the specified filter exists in this
   * storage.
   * 
   * @param {(number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
   *        The filter restricting on which records the callback will be
   *        executed. The first argument will be set to the record, the second
   *        argument will be set to the primary key of the record, and the
   *        third argument will be set to the key referencing the record (the
   *        primary key if traversing an object store).
   * @return {PromiseSync<boolean>} A promise that resolves to {@code true} if
   *         there is a record matching the provided filter.
   */

  _createClass(AbstractReadOnlyStorage, [{
    key: "exists",
    value: function exists(filter) {
      filter = (0, _utils.normalizeFilter)(filter, this.keyPath);

      var keyRange = undefined;
      if (filter instanceof Function) {
        keyRange = undefined;
      } else {
        keyRange = filter;
        filter = null;
      }

      var cursorFactory = this.createCursorFactory(keyRange);

      return new _PromiseSync2.default(function (resolve, reject) {
        cursorFactory(function (cursor) {
          if (filter) {
            if (filter(cursor.record, cursor.primaryKey, cursor.key)) {
              resolve(true);
              return;
            }

            cursor.continue();
            return;
          }

          resolve(true);
        }).then(function () {
          return resolve(false);
        }).catch(reject);
      });
    }

    /**
     * Calculates the number of records matching the specified filter.
     *
     * @param {?(undefined|number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)=} filter
     *        The filter restricting on which records the callback will be
     *        executed. The first argument will be set to the record, the second
     *        argument will be set to the primary key of the record, and the
     *        third argument will be set to the key referencing the record (the
     *        primary key if traversing an object store).
     * @return {PromiseSync<number>} A promise that resolves to the number of
     *         records satisfying the filter.
     */

  }, {
    key: "count",
    value: function count() {
      var filter = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

      filter = (0, _utils.normalizeFilter)(filter, this.keyPath);

      if (filter instanceof Function) {
        return this.forEach(filter, _CursorDirection2.default.NEXT, function () {});
      }

      var request = this[FIELDS.storage].count(filter);
      return _PromiseSync2.default.resolve(request);
    }

    /**
     * Executes the provided callback on the records in this storage that match
     * the specified filter.
     *
     * @param {?(undefined|number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
     *        The filter restricting on which records the callback will be
     *        executed. If a function is provided, the first argument will be set
     *        to the record, the second argument will be set to the primary key
     *        of the record, and the third argument will be set to the key
     *        referencing the record (the primary key if traversing an object
     *        store).
     * @param {(CursorDirection|string)} direction The direction in which the
     *        records should be traversed. Use either the
     *        {@code CursorDirection.*} constants, or strings {@code "NEXT"} and
     *        {@code "PREVIOUS"} (or {@code "PREV"} for short). The letter case
     *        used in the strings does not matter. Defaults to
     *        {@code CursorDirection.NEXT}.
     * @param {function(*, (number|string|Date|Array), (number|string|Date|Array))} callback
     *        The callback to execute on the records matching the filter. The
     *        first argument will be set to the record, the second argument will
     *        be set to the primary key of the record, and the third argument
     *        will be set to the key referencing the record (the primary key if
     *        traversing an object store).
     * @return {PromiseSync<number>} A promise that resolves to the number of
     *         records satisfying the filter.
     */

  }, {
    key: "forEach",
    value: function forEach(filter, direction, callback) {
      filter = (0, _utils.normalizeFilter)(filter, this.keyPath);

      var keyRange = undefined;
      if (filter instanceof Function) {
        keyRange = undefined;
      } else {
        keyRange = filter;
        filter = null;
      }

      var recordCount = 0;

      return this.createCursorFactory(keyRange, direction)(function (cursor) {
        if (!filter || filter(cursor.record, cursor.primaryKey, cursor.key)) {
          callback(cursor.record, cursor.primaryKey, cursor.key);
          recordCount++;
        }

        cursor.continue();
      }).then(function () {
        return recordCount;
      });
    }

    /**
     * Retrieves all records from this object store that match the specified
     * filter. The records will be listed in the specified order.
     *
     * @param {?(undefined|number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)=} filter
     *        The filter, restricting the records returned by this method. If a
     *        function is provided, the first argument will be set to the record,
     *        the second argument will be set to the primary key of the record,
     *        and the third argument will be set to the key referencing the
     *        record (the primary key if traversing an object store).
     * @param {CursorDirection} direction The direction in which the records are
     *        to be listed. Use either the {@code CursorDirection.*} constants,
     *        or strings {@code "NEXT"} and {@code "PREVIOUS"} (or {@code "PREV"}
     *        for short). The letter case used in the strings does not matter.
     *        Defaults to {@code CursorDirection.NEXT}.
     * @return {PromiseSync<Array<*>>} A promise that resolves to an array of all
     *         records matching the filter, listed in the specified order.
     */

  }, {
    key: "getAll",
    value: function getAll() {
      var _this2 = this;

      var filter = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];
      var direction = arguments.length <= 1 || arguments[1] === undefined ? _CursorDirection2.default.NEXT : arguments[1];

      return new _PromiseSync2.default(function (resolve, reject) {
        var records = [];

        _this2.forEach(filter, direction, function (record) {
          records.push(record);
        }).then(function () {
          return resolve(records);
        }).catch(reject);
      });
    }

    /**
     * Lists the records in this storage in pages of specified size.
     *
     * The records will be returned in a {@linkcode RecordStore}, which is an
     * augmented array that can be used to fetch the next page of this listing of
     * records.
     *
     * The {@linkcode RecordStore} is not dependent on the current transaction,
     * and therefore the next pages can be fetched even after an arbitrary delay
     * after the current transaction has ended.
     *
     * Fetching the next pages of records will not be affected by read-write
     * operations. Note that new records with primary key of previous value
     * (depending on the used cursor direction) to the last internally traversed
     * record will not be included in the next pages, as the record list always
     * fetches the next page by fetching the records since the primary key of the
     * last internally traversed record.
     *
     * Deleting all records after the last fetched record and fetching the next
     * page will result in fetching an empty page of records, that will be marked
     * as the last page.
     *
     * Finally, this method has a slight overhead, because the record list needs
     * to look ahead for one record matching the filter after the last returned
     * record to determine whether additional pages of records are available.
     *
     * @param {?(undefined|number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)=} filter
     *        The filter, restricting the records returned by this method. If a
     *        function is provided, the first argument will be set to the record,
     *        the second argument will be set to the primary key of the record,
     *        and the third argument will be set to the key referencing the
     *        record (the primary key if traversing an object store).
     * @param {(CursorDirection|string)} direction The direction in which the
     *        records are to be listed. Use either the {@code CursorDirection.*}
     *        constants, or strings {@code "NEXT"} and {@code "PREVIOUS"} (or
     *        {@code "PREV"} for short). The letter case used in the strings does
     *        not matter.
     *        Defaults to {@code CursorDirection.NEXT}.
     * @param {number} pageSize The number of records per page.
     * @return {Promise<RecordList<*>>} A promise that resolves to a record list
     *         of the fetched records matching the filter.
     */

  }, {
    key: "list",
    value: function list() {
      var filter = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];
      var direction = arguments.length <= 1 || arguments[1] === undefined ? _CursorDirection2.default.NEXT : arguments[1];
      var pageSize = arguments.length <= 2 || arguments[2] === undefined ? 50 : arguments[2];

      if (!/^[1-9]\d*$/.test("" + pageSize)) {
        throw new Error("The page size must be a positive integer, " + (pageSize + " provided"));
      }

      // convert the filter to a filter function - we need to always set our key
      // range ourselves to have a high-performance paging
      filter = (0, _utils.normalizeFilter)(filter, this.keyPath);
      var keyRange = undefined;
      if (filter instanceof IDBKeyRange) {
        keyRange = filter;
        if (this.keyPath) {
          filter = (0, _utils.keyRangeToFieldRangeObject)(filter, this.keyPath);
          filter = (0, _utils.compileFieldRangeFilter)(filter);
        } else {
          (function () {
            var primaryKeyFilter = (0, _utils.compileFieldRangeFilter)({
              primaryKey: filter
            });
            filter = function (record, primaryKey) {
              return primaryKeyFilter({
                primaryKey: primaryKey
              });
            };
          })();
        }
      }

      // fetch the first page of records and create a record list
      var unique = this[FIELDS.unique];
      var storageFactory = this[FIELDS.storageFactory];
      return _list(this, keyRange, filter, direction, unique, pageSize, storageFactory);
    }
  }]);

  return AbstractReadOnlyStorage;
}(_AbstractBaseStorage3.default);

/**
 * Creates a promise that resolves to a record list containing the first page
 * of records matching the provided filter.
 *
 * @param {AbstractReadOnlyStorage} storage The current storage accessor - will
 *        be used to fetch the first page of records.
 * @param {(undefined|IDBKeyRange)} keyRange The key range to use for the first
 *        page or records.
 * @param {(undefined|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
 *        The filter function restricting the records that will be listed.
 *        If a function is provided, the first argument will be set to the
 *        record, the second argument will be set to the primary key of the
 *        record, and the third argument will be set to the key referencing the
 *        record (the primary key if traversing an object store).
 * @param {CursorDirection} direction The direction in which the records in the
 *        storage should be listed.
 * @param {boolean} unique When {@code true}, the keys by which the records are
 *        organized in the store are always unique for each record.
 * @param {number} pageSize The maximum number of records per page. Must be a
 *        positive integer.
 * @param {function(): AbstractReadOnlyStorage} storageFactory A function that
 *        creates a new read-only transaction and returns this storage accessor
 *        each time it is invoked.
 * @return {Promise<RecordList<*>>} A promise that resolves to a record list of
 *         the fetched records matching the filter.
 */

exports.default = AbstractReadOnlyStorage;
function _list(storage, keyRange, filter, direction, unique, pageSize, storageFactory) {
  return new Promise(function (resolve, reject) {
    var items = [];

    storage.createCursorFactory(keyRange, direction)(function (cursor) {
      if (!filter || filter(cursor.record, cursor.primaryKey, cursor.key)) {
        if (items.length === pageSize) {
          finalize(true, cursor.key, cursor.primaryKey);
          return;
        } else {
          items.push(cursor.record);
        }
      }

      cursor.continue();
    }).then(function () {
      return finalize(false, null, null);
    }).catch(function (error) {
      return reject(error);
    });

    function finalize(hasNextPage, nextKey, nextPrimaryKey) {
      resolve(new _RecordList2.default(items, storageFactory, nextKey, nextPrimaryKey, direction, unique, filter, pageSize, hasNextPage));
    }
  });
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