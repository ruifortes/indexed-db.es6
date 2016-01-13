"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _Transaction = require("../transaction/Transaction");

var _Transaction2 = _interopRequireDefault(_Transaction);

var _ObjectStoreMigrator = require("./ObjectStoreMigrator");

var _ObjectStoreMigrator2 = _interopRequireDefault(_ObjectStoreMigrator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  database: Symbol("database"),
  transaction: Symbol("transaction"),
  objectStores: Symbol("objectStores")
});

/**
 * Utility for migrating the database schema by a single version.
 */

var DatabaseVersionMigrator = function () {
  /**
   * Initializes the database version migrator.
   * 
   * @param {IDBDatabase} database The database to upgrade.
   * @param {IDBTransaction} transaction The {@code versionchange} transaction.
   * @param {(ObjectStoreSchema[]|Object[])} objectStores Descriptors of object
   *        stores representing the schema the database should have after the
   *        migration. Use either {@linkcode ObjectStoreSchema} instances or
   *        plain object with compatible structure.
   */

  function DatabaseVersionMigrator(database, transaction, objectStores) {
    _classCallCheck(this, DatabaseVersionMigrator);

    /**
     * The database to upgrade.
     * 
     * @type {IDBDatabase}
     */
    this[FIELDS.database] = database;

    /**
     * The {@code versionchange} transaction.
     * 
     * @type {IDBTransaction}
     */
    this[FIELDS.transaction] = transaction;

    /**
     * Descriptors of object stores representing the schema the database should
     * have after the migration.
     * 
     * @type {(ObjectStoreSchema[]|Object[])}
     */
    this[FIELDS.objectStores] = objectStores;

    Object.freeze(this);
  }

  /**
   * Upgrades the database schema and executes the provided callback within the
   * transaction provided in the constructor.
   * 
   * @param {function(Transaction, Object<string, {key: (number|string|Date|Array), record: *}[]>): ?PromiseSync<undefined>} onComplete
   *        Callback to execute when the schema has been successfully migrated.
   *        If the callback performs database operations, it must execute the
   *        first operation synchronously, the subsequent operations may be
   *        executed from the operation promise callbacks.
   * @param {Object<string, {key: (number|string|Date|Array), record: *}[]>} callbackData
   *        The data to pass as the second argument of the callback.
   * @return {PromiseSync<undefined>} A promise that resolves when the database
   *         schema has been upgraded and the promise returned by the callback
   *         resolves.
   */

  _createClass(DatabaseVersionMigrator, [{
    key: "executeMigration",
    value: function executeMigration(onComplete, callbackData) {
      var nativeDatabase = this[FIELDS.database];
      var nativeTransaction = this[FIELDS.transaction];
      var objectStores = this[FIELDS.objectStores];
      upgradeSchema(nativeDatabase, nativeTransaction, objectStores);

      return _PromiseSync2.default.resolve().then(function () {
        var transaction = new _Transaction2.default(nativeTransaction, function () {
          return transaction;
        });
        transaction.completionPromise.catch(function () {});

        var promise = _PromiseSync2.default.resolve(onComplete(transaction, callbackData));
        return promise.then(function () {
          return undefined;
        });
      });
    }
  }]);

  return DatabaseVersionMigrator;
}();

/**
 * Updates the schema of the provided Indexed DB database to the schema
 * specified by the provided schema descriptors.
 * 
 * @param {IDBDatabase} nativeDatabase The native Indexed DB database being
 *        migrated.
 * @param {IDBTransaction} nativeTransaction The native {@code versionchange}
 *        transaction.
 * @param {((DatabaseSchema|UpgradedDatabaseSchema))[]} descriptors Schema
 *        descriptor of the version to which the database is to be upgraded.
 */

exports.default = DatabaseVersionMigrator;
function upgradeSchema(nativeDatabase, nativeTransaction, descriptors) {
  var objectStoreNames = Array.from(nativeDatabase.objectStoreNames);
  var newObjectStoreNames = descriptors.map(function (objectStore) {
    return objectStore.name;
  });
  objectStoreNames.forEach(function (objectStoreName) {
    if (newObjectStoreNames.indexOf(objectStoreName) === -1) {
      nativeDatabase.deleteObjectStore(objectStoreName);
    }
  });

  descriptors.forEach(function (objectStoreDescriptor) {
    var objectStoreName = objectStoreDescriptor.name;
    var nativeObjectStore = objectStoreNames.indexOf(objectStoreName) > -1 ? nativeTransaction.objectStore(objectStoreName) : null;

    var objectStoreMigrator = new _ObjectStoreMigrator2.default(nativeDatabase, nativeObjectStore, objectStoreDescriptor);
    objectStoreMigrator.executeMigration();
  });
}