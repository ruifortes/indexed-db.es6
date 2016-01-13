"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _validation = require("./validation");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Descriptor of database schema used to describe the schema ONLY FOR the
 * INITIAL version of the database. Use the {@linkcode UpgradedDatabaseSchema}
 * and {@linkcode DatabaseSchemaDiff} classes to specify the schema of upgraded
 * database versions.
 */

var DatabaseSchema =
/**
 * Initializes the initial database schema descriptor.
 *
 * @param {number} version The database version number, specified as a
 *        positive integer.
 * @param {...ObjectStoreSchema} objectStores The schema of the object stores
 *        to be present in the database.
 */
function DatabaseSchema(version) {
    _classCallCheck(this, DatabaseSchema);

    if (!(0, _validation.isVersionValid)(version)) {
        throw new TypeError("The version must be a positive integer, " + (version + " provided"));
    }

    for (var _len = arguments.length, objectStores = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        objectStores[_key - 1] = arguments[_key];
    }

    var duplicateNames = (0, _validation.getDuplicateNames)(objectStores);
    if (duplicateNames.length) {
        throw new Error("The following object stores are defined multiple " + ("times: " + duplicateNames.join(", ")));
    }

    /**
     * The database version number, specified as a positive integer.
     *
     * @type {number}
     */
    this.version = version;

    /**
     * Object stores to be defined in this version of the database.
     *
     * @type {ObjectStoreSchema[]}
     */
    this.objectStores = objectStores;

    Object.freeze(this);
};

exports.default = DatabaseSchema;