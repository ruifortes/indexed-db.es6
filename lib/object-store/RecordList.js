"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _NativeDBAccessor = require("../NativeDBAccessor");

var _KeyRange = require("./KeyRange");

var _KeyRange2 = _interopRequireDefault(_KeyRange);

var _CursorDirection = require("./CursorDirection");

var _CursorDirection2 = _interopRequireDefault(_CursorDirection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  storageFactory: Symbol("storageFactory"),
  nextKey: Symbol("nextKey"),
  firstPrimaryKey: Symbol("firstPrimaryKey"),
  cursorDirection: Symbol("cursorDirection"),
  unique: Symbol("unique"),
  filter: Symbol("filter"),
  pageSize: Symbol("pageSize"),
  hasNextPage: Symbol("hasNextPage")
});

/**
 * The record list is an array of records, representing a single page of record
 * listing.
 *
 * The record list provides API for easy fetching of the next page of records,
 * while not being dependent on the current transaction.
 */

var RecordList = function (_Array) {
  _inherits(RecordList, _Array);

  /**
   * Initializes the record list.
   *
   * @param {*[]} items The records of the record list.
   * @param {function(): AbstractReadOnlyStorage} storageFactory A function
   *        that creates a new read-only transaction and returns this storage
   *        accessor each time it is invoked.
   * @param {(number|string|Date|Array)} nextKey The storage key of the first
   *        record to include in the next page.
   * @param {(number|string|Date|Array)} firstPrimaryKey The primary key of the
   *        first record to include in the next page.
   * @param {CursorDirection} cursorDirection The direction in which the
   *        records of the storage are traversed.
   * @param {boolean} unique Set to {@code true} if the key used by the storage
   *        to organize records has a unique value for each record.
   * @param {(undefined|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
   *        The filter function restricting the records that will be listed.
   * @param {number} pageSize The number of records per page specified as a
   *        positive integer.
   * @param {boolean} hasNextPage Set to {@code true} if more records were
   *        available when this record list was initialized.
   */

  function RecordList(items, storageFactory, nextKey, firstPrimaryKey, cursorDirection, unique, filter, pageSize, hasNextPage) {
    _classCallCheck(this, RecordList);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RecordList).call(this));

    if (items.length > pageSize) {
      throw new Error("The record list cannot be longer than the page size");
    }

    /**
     * A function that creates a new read-only transaction and returns this
     * storage accessor each time it is invoked.
     *
     * @type {function(): AbstractReadOnlyStorage}
     */
    _this[FIELDS.storageFactory] = storageFactory;

    /**
     * The storage key of the first record to include in the next page.
     *
     * @type {(number|string|Date|Array)}
     */
    _this[FIELDS.nextKey] = nextKey;

    /**
     * The primary key of the first record to include in the next page.
     *
     * @type {(number|string|Date|Array)}
     */
    _this[FIELDS.firstPrimaryKey] = firstPrimaryKey;

    /**
     * The direction in which the records of the storage are traversed.
     *
     * @type {CursorDirection}
     */
    _this[FIELDS.cursorDirection] = cursorDirection;

    /**
     * Set to {@code true} if the key used by the storage to organize records
     * has a unique value for each record.
     *
     * @type {boolean}
     */
    _this[FIELDS.unique] = unique;

    /**
     * The filter function restricting the records that will be listed.
     *
     * @type {(undefined|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)}
     */
    _this[FIELDS.filter] = filter;

    /**
     * The number of records per page specified as a positive integer.
     *
     * @type {number}
     */
    _this[FIELDS.pageSize] = pageSize;

    /**
     * Set to {@code true} if more records were available when this record list
     * was initialized.
     *
     * @type {boolean}
     */
    _this[FIELDS.hasNextPage] = hasNextPage;

    _this.push.apply(_this, items);
    return _this;
  }

  /**
   * Returns {@code true} if a next page of records is available. The method
   * may return {@code true} even if there are no more records available
   * because they were deleted since this record list was initialized.
   *
   * @rerurn {@code true} if a next page of records is available.
   */

  _createClass(RecordList, [{
    key: "fetchNextPage",

    /**
     * Fetches the next page of records. The records will be fetched in a new
     * read-only transaction.
     *
     * @return {Promise<RecordList<*>>} A promise that resolves to the records
     *         list containing the next page of records.
     */
    value: function fetchNextPage() {
      if (!this.hasNextPage) {
        throw new Error("There are no more pages of records to fetch");
      }

      var storageFactory = this[FIELDS.storageFactory];
      var cursorDirection = this[FIELDS.cursorDirection];
      var unique = this[FIELDS.unique];
      var keyRange = undefined;
      if (cursorDirection === _CursorDirection2.default.NEXT) {
        keyRange = _KeyRange2.default.lowerBound(this[FIELDS.nextKey]);
      } else {
        keyRange = _KeyRange2.default.upperBound(this[FIELDS.nextKey]);
      }
      var pageSize = this[FIELDS.pageSize];

      return _fetchNextPage(storageFactory, keyRange, cursorDirection, unique, this[FIELDS.firstPrimaryKey], this[FIELDS.filter], pageSize);
    }
  }, {
    key: "hasNextPage",
    get: function get() {
      return this[FIELDS.hasNextPage];
    }
  }]);

  return RecordList;
}(Array);

/**
 * Fetches the next page of records in a new ready-only transaction and
 * resolves into a record list containing the fetched records.
 *
 * @param {function(): AbstractReadOnlyStorage} storageFactory A function that
 *        creates a new read-only transaction and returns this storage accessor
 *        each time it is invoked.
 * @param {IDBKeyRange} keyRange The key range to use when opening the cursor
 *        in order to skip most of the records traversed previously.
 * @param {CursorDirection} cursorDirection The direction in which the records
 *        of the storage are traversed.
 * @param {boolean} unique Set to {@code true} if the key used by the storage
 *        to organize records has a unique value for each record.
 * @param {(number|string|Date|Array)} firstPrimaryKey The primary key of the
 *        first record to include to the result.
 * @param {(undefined|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
 *        The filter function restricting the records that will be listed.
 *        If a function is provided, the first argument will be set to the
 *        record, the second argument will be set to the primary key of the
 *        record, and the third argument will be set to the key referencing the
 *        record (the primary key if traversing an object store).
 * @param {number} pageSize The maximum number of records per page. Must be a
 *        positive integer.
 * @return {Promise<RecordList<*>>} A promise that resolves to the next page of
 *         records.
 */

exports.default = RecordList;
function _fetchNextPage(storageFactory, keyRange, cursorDirection, unique, firstPrimaryKey, filter, pageSize) {
  var storage = storageFactory();

  var nextItems = [];

  return new Promise(function (resolve, reject) {
    var idb = (0, _NativeDBAccessor.idbProvider)();
    var cursorFactory = storage.createCursorFactory(keyRange, cursorDirection, unique);

    cursorFactory(function (cursor) {
      if (!unique) {
        var shouldSkip = cursorDirection === _CursorDirection2.default.NEXT && idb.cmp(firstPrimaryKey, cursor.primaryKey) > 0 || cursorDirection === _CursorDirection2.default.PREVIOUS && idb.cmp(firstPrimaryKey, cursor.primaryKey) < 0;

        if (shouldSkip) {
          cursor.continue();
          return;
        }
      }

      if (!filter || filter(cursor.record, cursor.primaryKey, cursor.key)) {
        if (nextItems.length === pageSize) {
          finalize(true, cursor.key, cursor.primaryKey);
          return;
        } else {
          nextItems.push(cursor.record);
        }
      }

      cursor.continue();
    }).then(function () {
      return finalize(false, null, null);
    }).catch(function (error) {
      return reject(error);
    });

    function finalize(hasNextPage, nextKey, nextPrimaryKey) {
      resolve(new RecordList(nextItems, storageFactory, nextKey, nextPrimaryKey, cursorDirection, unique, filter, pageSize, hasNextPage));
    }
  });
}