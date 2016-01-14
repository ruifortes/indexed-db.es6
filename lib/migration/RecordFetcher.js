"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _CursorDirection = require("../object-store/CursorDirection");

var _CursorDirection2 = _interopRequireDefault(_CursorDirection);

var _UpgradedDatabaseSchema = require("../schema/UpgradedDatabaseSchema");

var _UpgradedDatabaseSchema2 = _interopRequireDefault(_UpgradedDatabaseSchema);

var _Transaction = require("../transaction/Transaction");

var _Transaction2 = _interopRequireDefault(_Transaction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Utility for fetching (and deleting) records from a database for the purpose
 * of database data migration between schema version upgrades.
 */

var RecordFetcher = function () {
  function RecordFetcher() {
    _classCallCheck(this, RecordFetcher);
  }

  _createClass(RecordFetcher, [{
    key: "fetchRecords",

    /**
     * Uses the provided transaction, fetches all records from the specified
     * object stores and returns the fetched records.
     * 
     * @param {IDBTransaction} nativeTransaction The Indexed DB transaction to
     *        use to fetch the records.
     * @param {{objectStore: string, preprocessor: function(*, (number|string|Date|Array)): (*|UpgradedDatabaseSchema.SKIP_RECORD|UpgradedDatabaseSchema.DELETE_RECORD)}[]} objectStores
     *        Names names of object stores from which all records should be
     *        fetched and a map/filter callback function executed to preprocess
     *        the records.
     *        The callback function will executed with the following arguments:
     *        - the record
     *        - the primary key of the record (will be frozen to prevent any
     *          modifications)
     * 
     *        The callback may return either the preprocessed record, or
     *        {@linkcode UpgradedDatabaseSchema.SKIP_RECORD} to indicate that the
     *        record should be omitted from the records passed to the
     *        after-migration callback, or
     *        {@linkcode UpgradedDatabaseSchema.DELETE_RECORD} to both omit the
     *        record from the records passed to the after-migration callback and
     *        delete the record.
     * @return {PromiseSync<Object<string, {key: (number|string|Date|Array), record: *}[]>>}
     *         A promise that resolves to a map of object store names to the
     *         records fetched from the object store, except for the records
     *         marked for skipping or deletion.
     */
    value: function fetchRecords(nativeTransaction, objectStores) {
      if (!objectStores.length) {
        throw new Error("The object stores array cannot be empty");
      }

      var transaction = new _Transaction2.default(nativeTransaction, function () {
        return transaction;
      });

      return fetchAllRecords(transaction, objectStores);
    }
  }]);

  return RecordFetcher;
}();

/**
 * Fetches all records from the specified object stores using the provided
 * read-write transaction.
 * 
 * @param {Transaction} transaction The read-write transaction to use to access
 *        the object stores.
 * @param {(string|{objectStore: string, preprocessor: function(*, (number|string|Date|Array)): (*|UpgradedDatabaseSchema.SKIP_RECORD|UpgradedDatabaseSchema.DELETE_RECORD)=})[]} objectStores
 *        The names of object stores that should have their records fetch or
 *        (possibly partially filled) object store fetch descriptors, mixed in
 *        an array.
 * @return {PromiseSync<Object<string, {key: (number|string|Date|Array), record: *}[]>>}
 *         A promise that resolves once all the records have been fetched and
 *         the records marked for deletion were deleted.
 *         The promise resolves to a map of object store names to the records
 *         fetched from the object store, except for the records marked for
 *         skipping or deletion.
 */

exports.default = RecordFetcher;
function fetchAllRecords(transaction, objectStores) {
  return _PromiseSync2.default.all(objectStores.map(function (descriptor) {
    return fetchRecords(transaction.getStore(descriptor.objectStore), descriptor.preprocessor);
  })).then(function (fetchedRecords) {
    var recordsMap = {};

    for (var i = 0; i < objectStores.length; i++) {
      recordsMap[objectStores[i].objectStore] = fetchedRecords[i];
    }

    return recordsMap;
  });
}

/**
 * Extracts all records from the provided object store and preprocess them
 * using the provided preprocessor.
 * 
 * The method traverses the records of the object store in ascending order of
 * their primary keys, deleting the records for which the preprocessor returns
 * the {@linkcode UpgradedDatabaseSchema.DELETE_RECORD} before traversing to
 * the next record.
 * 
 * @param {ObjectStore} objectStore The read-write accessor the object store
 *        from which the records should be read.
 * @param {function(*, (number|string|Date|Array)): (*|UpgradedDatabaseSchema.SKIP_RECORD|UpgradedDatabaseSchema.DELETE_RECORD)} preprocessor
 *        The callback to call on each record. The value returned by it will be
 *        stored in the resulting record array instead of the original record.
 *        The record will not be included in the resulting record array if the
 *        preprocessor returns {@linkcode UpgradedDatabaseSchema.SKIP_RECORD}
 *        or {@linkcode UpgradedDatabaseSchema.DELETE_RECORD}.
 * @return {PromiseSync<{key: (number|string|Date|Array), record: *}[]>} A
 *         promise that resolves once all records in the object store have been
 *         traversed. The promise will resolve to an array of the records
 *         processed by the provided record preprocessor, in the order they
 *         were traversed, and not containing the records that the preprocessor
 *         marked as to be skipped or deleted.
 */
function fetchRecords(objectStore, preprocessor) {
  return new _PromiseSync2.default(function (resolve, reject) {
    var records = [];

    objectStore.openCursor(null, _CursorDirection2.default.NEXT, function (cursor) {
      var primaryKey = cursor.primaryKey;
      if (primaryKey instanceof Object) {
        Object.freeze(primaryKey);
      }

      var preprocessedRecord = preprocessor(cursor.record, primaryKey);
      if (preprocessedRecord === _UpgradedDatabaseSchema2.default.DELETE_RECORD) {
        cursor.delete();
        cursor.continue();
        return;
      } else if (preprocessedRecord !== _UpgradedDatabaseSchema2.default.SKIP_RECORD) {
        records.push({
          key: primaryKey,
          record: preprocessedRecord
        });
      } else {
        // SKIP_RECORD returned, do nothing
      }

      cursor.continue();
    }).then(function () {
      return resolve(records);
    }).catch(function (error) {
      return reject(error);
    });
  });
}