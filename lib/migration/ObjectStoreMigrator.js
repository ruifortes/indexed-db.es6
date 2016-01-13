"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  database: Symbol("database"),
  objectStore: Symbol("objectStore"),
  schema: Symbol("schema")
});

/**
 * Migrator of object store schemas.
 */

var ObjectStoreMigrator = function () {
  /**
   * Initializes the object store migrator.
   *
   * @param {IDBDatabase} database The native Indexed DB database being
   *        migrated.
   * @param {?IDBObjectStore} nativeObjectStore The native Indexed DB object
   *        store being migrated. Set to {@code null} if the object store does
   *        not exist yet.
   * @param {ObjectStoreSchema} schema Schema descriptor of the version to
   *        which the database is to be upgraded.
   */

  function ObjectStoreMigrator(database, nativeObjectStore, schema) {
    _classCallCheck(this, ObjectStoreMigrator);

    /**
     * The native Indexed DB database being migrated.
     *
     * @type {IDBDatabase}
     */
    this[FIELDS.database] = database;

    /**
     * The native Indexed DB object store being migrated, or {@code null} if
     * the object store does not exist yet.
     *
     * @type {?IDBObjectStore}
     */
    this[FIELDS.objectStore] = nativeObjectStore;

    /**
     * The schema to which the object store should be migrated.
     *
     * @type {ObjectStoreSchema}
     */
    this[FIELDS.schema] = schema;

    Object.freeze(this);
  }

  /**
   * Processes the schema descriptor and migrates the object store. The object
   * store will be created if it does not already exist.
   */

  _createClass(ObjectStoreMigrator, [{
    key: "executeMigration",
    value: function executeMigration() {
      var schema = this[FIELDS.schema];
      var objectStore = this[FIELDS.objectStore];
      if (!objectStore) {
        objectStore = this[FIELDS.database].createObjectStore(schema.name, {
          keyPath: schema.keyPath || null,
          autoIncrement: schema.autoIncrement
        });
      }

      var indexNames = Array.from(objectStore.indexNames);
      indexNames.forEach(function (indexName) {
        if (shouldDeleteIndex(objectStore, schema, indexName)) {
          objectStore.deleteIndex(indexName);
        }
      });

      var schemaIndexes = schema.indexes || [];
      schemaIndexes.forEach(function (indexSchema) {
        createIndex(objectStore, indexSchema);
      });
    }
  }]);

  return ObjectStoreMigrator;
}();

/**
 * Returns {@code true} if the index should be deleted from the object store,
 * whether because it is no longer present in the schema or its properties have
 * been updated in the schema.
 *
 * @param {IDBObjectStore} objectStore The native Indexed DB object store.
 * @param {ObjectStoreSchema} schema The schema of the object store.
 * @param {string} indexName The name of the index being tested whether it
 *        should be deleted.
 * @return {@code true} if the index should be deleted.
 */

exports.default = ObjectStoreMigrator;
function shouldDeleteIndex(objectStore, schema, indexName) {
  var schemaIndexes = schema.indexes || [];
  var newIndexNames = schemaIndexes.map(function (indexSchema) {
    return indexSchema.name;
  });

  if (newIndexNames.indexOf(indexName) === -1) {
    return true;
  }

  var index = objectStore.index(indexName);
  var indexKeyPath = index.keyPath;
  if (indexKeyPath && typeof indexKeyPath !== "string") {
    indexKeyPath = Array.from(indexKeyPath);
  }
  var serializedIndexKeyPath = JSON.stringify(indexKeyPath);

  var indexSchema = schemaIndexes.filter(function (indexSchema) {
    return indexSchema.name === index.name;
  })[0];

  return index.unique !== indexSchema.unique || index.multiEntry !== indexSchema.multiEntry || serializedIndexKeyPath !== JSON.stringify(indexSchema.keyPaths);
}

/**
 * Creates a new index in the provided object store according to the provided
 * index schema.
 *
 * @param {IDBObjectStore} objectStore The native Indexed DB object store.
 * @param {IndexSchema} indexSchema The schema of the index to create.
 */
function createIndex(objectStore, indexSchema) {
  var indexNames = Array.from(objectStore.indexNames);

  if (indexNames.indexOf(indexSchema.name) !== -1) {
    return;
  }

  objectStore.createIndex(indexSchema.name, indexSchema.keyPath, {
    unique: indexSchema.unique,
    multiEntry: indexSchema.multiEntry
  });
}