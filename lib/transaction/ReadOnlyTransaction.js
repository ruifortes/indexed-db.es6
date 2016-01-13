"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ReadOnlyObjectStore = require("../object-store/ReadOnlyObjectStore");

var _ReadOnlyObjectStore2 = _interopRequireDefault(_ReadOnlyObjectStore);

var _ReadOnlyCursor = require("../object-store/ReadOnlyCursor");

var _ReadOnlyCursor2 = _interopRequireDefault(_ReadOnlyCursor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Private field symbols.
 */
var FIELDS = Object.freeze({
  transaction: Symbol("transaction"),
  transactionFactory: Symbol("transactionFactory"),
  objectStores: Symbol("objectStores"),
  completeListeners: Symbol("completeListeners"),
  abortListeners: Symbol("abortListeners"),
  errorListeners: Symbol("errorListeners"),
  flags: Symbol("flags")
});

/**
 * A transaction with only a read-only access to the selected object stores.
 */

var ReadOnlyTransaction = function () {
  /**
   * Initializes the read-only transaction.
   *
   * @param {IDBTransaction} transaction The IndexedDB native transaction.
   * @param {function(string): ReadOnlyTransaction} transactionFactory The
   *        factory function that creates a new read-only transaction with
   *        access only the to the object store specified by the provided
   *        argument every time the function is invoked.
   */

  function ReadOnlyTransaction(transaction, transactionFactory) {
    var _this = this;

    _classCallCheck(this, ReadOnlyTransaction);

    /**
     * The native IndexedDB transaction object.
     *
     * @type {IDBTransaction}
     */
    this[FIELDS.transaction] = transaction;

    /**
     * The factory function that creates a new read-only transaction with
     * access only the to the object store specified by the provided argument
     * every time the function is invoked.
     *
     * @type {function(string): ReadOnlyTransaction}
     */
    this[FIELDS.transactionFactory] = transactionFactory;

    /**
     * Cache of created object store instances. The keys are the names of the
     * object stores.
     *
     * @type {Map<string, ReadOnlyObjectStore>}
     */
    this[FIELDS.objectStores] = new Map();

    /**
     * Event listeners for the {@code complete} event.
     *
     * @type {Set<function()>}
     */
    this[FIELDS.completeListeners] = new Set();

    /**
     * Event listeners for the {@code abort} event.
     *
     * @type {Set<function()>}
     */
    this[FIELDS.abortListeners] = new Set();

    /**
     * Event listeners of the {@code error} event.
     *
     * @type {Set<function(Error)>}
     */
    this[FIELDS.errorListeners] = new Set();

    /**
     * Flags used for tracking the state of the transaction.
     *
     * @type {{aborted: boolean}}
     */
    this[FIELDS.flags] = {
      aborted: false
    };

    /**
     * A promise that resolves when the transaction is completed, and rejects
     * when it is aborted on encounters an unexpected error.
     *
     * @type {Promise<undefined>}
     */
    this.completionPromise = new Promise(function (resolve, reject) {
      _this.addCompleteListener(resolve);
      _this.addAbortListener(function () {
        var abortError = new Error("The transaction has been aborted");
        abortError.name = "AbortError";
        reject(abortError);
      });
      _this.addErrorListener(function (error) {
        if (_this[FIELDS.flags].aborted) {
          return; // the transaction has been manually aborted
        }
        reject(error);
      });
    });

    transaction.oncomplete = function () {
      executeEventListeners(_this[FIELDS.completeListeners]);
    };

    transaction.onabort = function () {
      executeEventListeners(_this[FIELDS.abortListeners]);
    };

    transaction.onerror = function (event) {
      executeEventListeners(_this[FIELDS.errorListeners], transaction.error);
      event.preventDefault();
    };

    this.addErrorListener(function (error) {
      if (_this[FIELDS.errorListeners].size < 2) {
        console.error("Encountered an uncaptured transaction-level error " + "while no error listeners were registered", error);
      }
    });

    if (this.constructor === ReadOnlyTransaction) {
      Object.freeze(this);
    }
  }

  /**
   * Registers the provided listener to be executed when the transaction is
   * completed.
   *
   * The order in which the event listeners will be executed is undefined and
   * should not be relied upon.
   * 
   * This method provides a more low-level access to the transaction lifecycle
   * which can be useful in certain situations, however, it is recommended to
   * use the {@linkcode completionPromise} instead as it makes promise chaining
   * easier.
   *
   * @param {function()} listener The listener to register.
   */

  _createClass(ReadOnlyTransaction, [{
    key: "addCompleteListener",
    value: function addCompleteListener(listener) {
      this[FIELDS.completeListeners].add(listener);
    }

    /**
     * Registers the provided listener to be executed when the transaction is
     * aborted by calling the {@linkcode abort()} method, or due to an error.
     *
     * The order in which the event listeners will be executed is undefined and
     * should not be relied upon.
     * 
     * This method provides a more low-level access to the transaction lifecycle
     * which can be useful in certain situations, however, it is recommended to
     * use the {@linkcode completionPromise} instead as it makes promise chaining
     * easier.
     *
     * @param {function()} listener The listener to register.
     */

  }, {
    key: "addAbortListener",
    value: function addAbortListener(listener) {
      this[FIELDS.abortListeners].add(listener);
    }

    /**
     * Registers the provided listener to be executed when an error is
     * encountered during the manipulation of the database from this transaction,
     * and the error was not somehow captured during the processing of the
     * operation that caused the error.
     *
     * The order in which the event listeners will be executed is undefined and
     * should not be relied upon.
     * 
     * This method provides a more low-level access to the transaction lifecycle
     * which can be useful in certain situations, however, it is recommended to
     * use the {@linkcode completionPromise} instead as it makes promise chaining
     * easier.
     *
     * @param {function(Error)} listener The listener to register.
     */

  }, {
    key: "addErrorListener",
    value: function addErrorListener(listener) {
      this[FIELDS.errorListeners].add(listener);
    }

    /**
     * Aborts this transaction. Calling this method will lead to the execution of
     * the abort listeners registered on this transaction.
     */

  }, {
    key: "abort",
    value: function abort() {
      this[FIELDS.flags].aborted = true;
      Object.freeze(this[FIELDS.flags]);
      this[FIELDS.transaction].abort();
    }

    /**
     * Returns the read-only object store of the specified name. The method
     * returns the same object store if called repeatedly with the same argument.
     *
     * @param {string} objectStoreName The name of the object store to retrieve.
     * @return {ReadOnlyObjectStore} The object store.
     */

  }, {
    key: "getObjectStore",
    value: function getObjectStore(objectStoreName) {
      var _this2 = this;

      if (this[FIELDS.objectStores].has(objectStoreName)) {
        return this[FIELDS.objectStores].get(objectStoreName);
      }

      var transactionFactory = function transactionFactory() {
        return _this2[FIELDS.transactionFactory](objectStoreName);
      };

      var idbObjectStore = this[FIELDS.transaction].objectStore(objectStoreName);
      var objectStore = new _ReadOnlyObjectStore2.default(idbObjectStore, _ReadOnlyCursor2.default, transactionFactory);
      this[FIELDS.objectStores].set(objectStoreName, objectStore);

      return objectStore;
    }
  }]);

  return ReadOnlyTransaction;
}();

/**
 * Executes the provided event listeners with the provided parameters. Any
 * errors thrown by the executed event listeners will be caught and logged to
 * the console, and then the remaining event listeners will be executed.
 *
 * @param {function(...*)[]} listeners The event listeners to execute.
 * @param {...*} parameters The parameters to pass to the event listeners as
 *        arguments.
 */

exports.default = ReadOnlyTransaction;
function executeEventListeners(listeners) {
  for (var _len = arguments.length, parameters = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    parameters[_key - 1] = arguments[_key];
  }

  listeners.forEach(function (listener) {
    try {
      listener.apply(null, parameters);
    } catch (error) {
      console.error("An event listener threw an error", error);
    }
  });
}