"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.idbProvider = idbProvider;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var nativeIndexedDB = typeof indexedDB !== "undefined" ? indexedDB : null;

/**
 * The NativeDBAccessor serves as a registry for the current IndexedDB
 * implementation to use by indexed-db.es6. The task is handled by this class
 * because some browsers do not allow overriding the {@code window.indexedDB}
 * implementation with a custom one, thus preventing a shim from fixing the
 * issues in the native implementation.
 */

var NativeDBAccessor = function () {
  /**
   * Throws an error, this class is static.
   */

  function NativeDBAccessor() {
    _classCallCheck(this, NativeDBAccessor);

    throw new Error("The native DB accessor class is static");
  }

  /**
   * Returns the current IndexedDB implementation to use.
   *
   * @return {IDBFactory} The native IndexedDB implementation to use.
   */

  _createClass(NativeDBAccessor, null, [{
    key: "indexedDB",
    get: function get() {
      return nativeIndexedDB;
    }

    /**
     * Sets the IndexedDB implementation to use.
     *
     * @param {IDBFactory} newIndexedDBImplementation The new IndexedDB
     *        implementation to use.
     */
    ,
    set: function set(newIndexedDBImplementation) {
      nativeIndexedDB = newIndexedDBImplementation;
    }
  }]);

  return NativeDBAccessor;
}();

/**
 * Returns the current IndexedDB implementation to use.
 *
 * @return {IDBFactory} The current IndexedDB implementation to use.
 */

exports.default = NativeDBAccessor;
function idbProvider() {
  return NativeDBAccessor.indexedDB;
}