"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ObjectStore = require("../object-store/ObjectStore");

var _ObjectStore2 = _interopRequireDefault(_ObjectStore);

var _ReadOnlyTransaction2 = require("./ReadOnlyTransaction");

var _ReadOnlyTransaction3 = _interopRequireDefault(_ReadOnlyTransaction2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  transaction: Symbol("transaction"),
  transactionFactory: Symbol("transactionFactory"),
  objectStores: Symbol("objectStores")
});

/**
 * A transaction with read-write access to the selected object stores.
 */

var Transaction = function (_ReadOnlyTransaction) {
  _inherits(Transaction, _ReadOnlyTransaction);

  /**
   * Initializes the read-write transaction.
   *
   * @param {IDBTransaction} transaction The IndexedDB native transaction.
   * @param {function(string): ReadOnlyTransaction} transactionFactory The
   *        factory function that creates a new read-only transaction with
   *        access only the to the object store specified by the provided
   *        argument every time the function is invoked.
   */

  function Transaction(transaction, transactionFactory) {
    _classCallCheck(this, Transaction);

    /**
     * The native IndexedDB transaction object.
     *
     * @type {IDBTransaction}
     */

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Transaction).call(this, transaction, transactionFactory));

    _this[FIELDS.transaction] = transaction;

    /**
     * The factory function that creates a new read-only transaction with
     * access only the to the object store specified by the provided argument
     * every time the function is invoked.
     *
     * @type {function(string): ReadOnlyTransaction}
     */
    _this[FIELDS.transactionFactory] = transactionFactory;

    /**
     * Cache of created object store instances. The keys are the names of the
     * object stores.
     *
     * @type {Map<string, ObjectStore>}
     */
    _this[FIELDS.objectStores] = new Map();

    Object.freeze(_this);
    return _this;
  }

  /**
   * Returns the read-write object store of the specified name. The method
   * returns the same object store if called repeatedly with the same argument.
   *
   * @override
   * @param {string} objectStoreName The name of the object store to retrieve.
   * @return {ObjectStore} The object store.
   */

  _createClass(Transaction, [{
    key: "getStore",
    value: function getStore(objectStoreName) {
      var _this2 = this;

      if (this[FIELDS.objectStores].has(objectStoreName)) {
        return this[FIELDS.objectStores].get(objectStoreName);
      }

      var transactionFactory = function transactionFactory() {
        return _this2[FIELDS.transactionFactory](objectStoreName);
      };

      var idbObjectStore = this[FIELDS.transaction].objectStore(objectStoreName);
      var objectStore = new _ObjectStore2.default(idbObjectStore, transactionFactory);
      this[FIELDS.objectStores].set(objectStoreName, objectStore);

      return objectStore;
    }
  }]);

  return Transaction;
}(_ReadOnlyTransaction3.default);

exports.default = Transaction;