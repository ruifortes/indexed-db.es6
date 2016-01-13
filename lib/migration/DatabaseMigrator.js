"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PromiseSync = require("../PromiseSync");

var _PromiseSync2 = _interopRequireDefault(_PromiseSync);

var _RecordFetcher = require("./RecordFetcher");

var _RecordFetcher2 = _interopRequireDefault(_RecordFetcher);

var _DatabaseVersionMigrator = require("./DatabaseVersionMigrator");

var _DatabaseVersionMigrator2 = _interopRequireDefault(_DatabaseVersionMigrator);

var _DatabaseSchema = require("../schema/DatabaseSchema");

var _DatabaseSchema2 = _interopRequireDefault(_DatabaseSchema);

var _UpgradedDatabaseSchema = require("../schema/UpgradedDatabaseSchema");

var _UpgradedDatabaseSchema2 = _interopRequireDefault(_UpgradedDatabaseSchema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  database: Symbol("database"),
  transaction: Symbol("transaction"),
  schemaDescriptors: Symbol("schemaDescriptors"),
  currentVersion: Symbol("currentVersion")
});

/**
 * Database migrator evaluates the provided database schemas to upgrade the
 * database to the greatest described version.
 */

var DatabaseMigrator = function () {
  /**
   * Initializes the database migrator.
   *
   * @param {IDBDatabase} database The native Indexed DB database to upgrade.
   * @param {IDBTransaction} transaction The native {@code versionchange}
   *        transaction to use to manipulate the data.
   * @param {((DatabaseSchema|UpgradedDatabaseSchema)[]|Object[])} schemaDescriptors
   *        Descriptors of the database schema for all known database versions.
   * @param {number} currentVersion The current version of the database, as a
   *        positive integer, or set to {@code 0} if the database is being
   *        created.
   */

  function DatabaseMigrator(database, transaction, schemaDescriptors, currentVersion) {
    _classCallCheck(this, DatabaseMigrator);

    if (!schemaDescriptors.length) {
      throw new Error("The list of schema descriptors cannot be empty");
    }
    var sortedSchemasCopy = schemaDescriptors.slice().sort(function (desc1, desc2) {
      return desc1.version - desc2.version;
    });
    checkSchemaDescriptorTypes(sortedSchemasCopy);

    var isVersionValid = currentVersion >= 0 && parseInt(currentVersion, 10) === currentVersion;
    if (!isVersionValid) {
      throw new Error("The version number must be either a positive " + "integer, or 0 if the database is being created");
    }

    /**
     * The native Indexed DB database connection.
     *
     * @type {IDBDatabase}
     */
    this[FIELDS.database] = database;

    /**
     * The native {@code versionchange} transaction to use to manipulate the
     * data.
     * 
     * @type {IDBTransaction}
     */
    this[FIELDS.transaction] = transaction;

    /**
     * Descriptors of the database schemas across the versions of the database,
     * sorting by the database version in ascending order.
     *
     * The first element is always a {@linkcode DatabaseSchema} instance, the
     * rest of the elements are instances of the
     * {@linkcode UpgradedDatabaseSchema} classes.
     *
     * @type {(DatabaseSchema|UpgradedDatabaseSchema)[]}
     */
    this[FIELDS.schemaDescriptors] = Object.freeze(sortedSchemasCopy);

    /**
     * The current version of the database, before the migration was started.
     * The version number is either a positive integer, or {@code 0} if the
     * database is being created.
     *
     * @type {number}
     */
    this[FIELDS.currentVersion] = currentVersion;

    Object.freeze(this);
  }

  /**
   * Processes the schema descriptors and upgrades the database to the greatest
   * described version.
   * 
   * @return {PromiseSync<undefined>} A promise that resolves when the schema is
   *         upgraded to the greatest version specified in the schema
   *         descriptors.
   */

  _createClass(DatabaseMigrator, [{
    key: "executeMigration",
    value: function executeMigration() {
      return migrateDatabase(this[FIELDS.database], this[FIELDS.transaction], this[FIELDS.schemaDescriptors], this[FIELDS.currentVersion]);
    }
  }]);

  return DatabaseMigrator;
}();

/**
 * Processes the schema descriptors to upgrade the database schema to the
 * greatest version specified.
 * 
 * @param {IDBDatabase} nativeDatabase The native Indexed DB database being
 *        migrated to a higher version.
 * @param {IDBTransaction} nativeTransaction The native Indexed DB
 *        {@code versionchange} transaction to use to manipulate the data.
 * @param {(DatabaseSchema|UpgradedDatabaseSchema)[]} schemaDescriptors Schema
 *        descriptors of the database schemas for various versions, sorted in
 *        ascending order by the version number.
 * @param {number} currentVersion The current version of the database schema.
 * @return {PromiseSync<undefined>} A promise that resolves when the schema is
 *         upgraded to the greatest version specified in the schema
 *         descriptors.
 */

exports.default = DatabaseMigrator;
function migrateDatabase(nativeDatabase, nativeTransaction, schemaDescriptors, currentVersion) {
  var descriptorsToProcess = schemaDescriptors.filter(function (descriptor) {
    return descriptor.version > currentVersion;
  });

  if (!descriptorsToProcess.length) {
    return _PromiseSync2.default.resolve(undefined);
  }

  return migrateDatabaseVersion(nativeDatabase, nativeTransaction, descriptorsToProcess[0]).then(function () {
    return migrateDatabase(nativeDatabase, nativeTransaction, descriptorsToProcess, descriptorsToProcess[0].version);
  });
}

/**
 * Performs a single-version database migration to the schema described by the
 * provided database schema descriptor.
 *
 * @param {IDBDatabase} nativeDatabase The native Indexed DB database being
 *        migrated to a higher version.
 * @param {IDBTransaction} nativeTransaction The native Indexed DB
 *        {@code versionchange} transaction to use to manipulate the data.
 * @param {(DatabaseSchema|UpgradedDatabaseSchema)} descriptor Schema
 *        descriptor of the version to which the database is to be upgraded.
 * @return {PromiseSync<undefined>} A promise that resolves once the database
 *         has been upgraded to the schema described by the provided schema
 *         descriptor.
 */
function migrateDatabaseVersion(nativeDatabase, nativeTransaction, descriptor) {
  var fetchPromise = undefined;
  if (descriptor.fetchBefore && descriptor.fetchBefore.length) {
    var fetcher = new _RecordFetcher2.default();
    var objectStores = normalizeFetchBeforeObjectStores(descriptor.fetchBefore);
    fetchPromise = fetcher.fetchRecords(nativeTransaction, objectStores);
  } else {
    fetchPromise = _PromiseSync2.default.resolve({});
  }

  return fetchPromise.then(function (recordsMap) {
    var versionMigrator = new _DatabaseVersionMigrator2.default(nativeDatabase, nativeTransaction, descriptor.objectStores);

    return versionMigrator.executeMigration(descriptor.after || function () {}, recordsMap);
  });
}

/**
 * Normalizes the provided array of object store fetch descriptors to process
 * before upgrading the database schema.
 * 
 * @param {(string|{objectStore: string, preprocessor: function(*, (number|string|Date|Array)): (*|UpgradedDatabaseSchema.SKIP_RECORD|UpgradedDatabaseSchema.DELETE_RECORD)=})[]} objectStores
 *        The names of object stores that should have their records fetch or
 *        (possibly partially filled) object store fetch descriptors, mixed in
 *        an array.
 * @return {{objectStore: string, preprocessor: function(*, (number|string|Date|Array)): (*|UpgradedDatabaseSchema.SKIP_RECORD|UpgradedDatabaseSchema.DELETE_RECORD)}[]}
 *         Normalized object store fetch descriptors.
 */
function normalizeFetchBeforeObjectStores(objectStores) {
  return objectStores.map(function (objectStore) {
    if (typeof objectStore === "string") {
      return {
        objectStore: objectStore,
        preprocessor: function preprocessor(record) {
          return record;
        }
      };
    } else if (!objectStore.preprocessor) {
      return {
        objectStore: objectStore.objectStore,
        preprocessor: function preprocessor(record) {
          return record;
        }
      };
    } else {
      return objectStore;
    }
  });
}

/**
 * Validates the types of the provided schema descriptors.
 * 
 * @param {((DatabaseSchema|UpgradedDatabaseSchema)[]|Object[])} schemaDescriptors
 *        The database schemas for database versions to validate, sorted by
 *        version number in the ascending order.
 * @throws {TypeError} Thrown if the schema descriptors are of invalid type.
 */
function checkSchemaDescriptorTypes(schemaDescriptors) {
  var onlyPlainObjects = schemaDescriptors.every(function (descriptor) {
    return descriptor.constructor === Object;
  });
  if (onlyPlainObjects) {
    return;
  }

  if (!(schemaDescriptors[0] instanceof _DatabaseSchema2.default)) {
    throw new TypeError("The schema descriptor of the lowest described " + ("database version (" + schemaDescriptors[0].version + ") must be a ") + "DatabaseSchema instance, or all schema descriptors must be plain " + "objects");
  }
  schemaDescriptors.slice(1).forEach(function (descriptor) {
    if (!(descriptor instanceof _UpgradedDatabaseSchema2.default)) {
      throw new TypeError("The schema descriptors of the upgraded database " + "versions must be UpgradedDatabaseSchema instances, but the " + ("provided descriptor of version " + descriptor.version + " was not an ") + "UpgradedDatabaseSchema instance, or all schema descriptors must " + "be plain objects");
    }
  });
}