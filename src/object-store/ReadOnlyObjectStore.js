
import AbstractReadOnlyStorage from "./AbstractReadOnlyStorage"
import ReadOnlyIndex from "./ReadOnlyIndex"

/**
 * Private field symbols.
 */
const FIELDS = Object.freeze({
  objectStore: Symbol("objectStore"),
  indexes: Symbol("indexes"),
  transactionFactory: Symbol("transactionFactory")
})

/**
 * Read-only accessor to an object store.
 */
export default class ReadOnlyObjectStore extends AbstractReadOnlyStorage {
  /**
   * Initializes the read-only object store.
   *
   * @param {IDBObjectStore} storage The native Indexed DB object store.
   * @param {function(new: ReadyOnlyCursor)} cursorConstructor Constructor of
   *        the cursor to use when traversing the storage records.
   * @param {function(): ReadOnlyTransaction} transactionFactory A function
   *        that creates and returns a new read-only transaction each time it
   *        is invoked.
   */
  constructor(storage, cursorConstructor, transactionFactory) {
    let storageFactory = () => {
      let transaction = transactionFactory()
      return transaction.getObjectStore(storage.name)
    }
    super(storage, cursorConstructor, storageFactory)

    /**
     * When {@code true}, the keys of the newly created records in this object
     * store will be automatically generated by the object store.
     *
     * The generated keys are positive integers in ascending order.
     *
     * @type {boolean}
     */
    this.autoIncrement = storage.autoIncrement

    /**
     * The names of indexed defined on this object store.
     *
     * The names are sorted in the ascending order.
     *
     * @type {string[]}
     */
    this.indexNames = Object.freeze(Array.from(storage.indexNames))

    /**
     * The native Indexed DB object store.
     *
     * @type {IDBObjectStore}
     */
    this[FIELDS.objectStore] = storage

    /**
     * Cache of created index instances.
     *
     * @type {Map<string, ReadOnlyIndex>}
     */
    this[FIELDS.indexes] = new Map()

    /**
     * A function that creates and returns a new read-only transaction each
     * time it is invoked.
     *
     * @type {function(): ReadOnlyTransaction}
     */
    this[FIELDS.transactionFactory] = transactionFactory

    if (this.constructor === ReadOnlyObjectStore) {
      Object.freeze(this)
    }
  }

  /**
   * Retrieves the read-only index of the specified name.
   *
   * This method returns the same index object if invoked repeatedly with the
   * same name on the same instance.
   *
   * @param {string} indexName The name of the index to retrieve.
   * @return {ReadOnlyIndex} The requested index.
   */
  getIndex(indexName) {
    if (this[FIELDS.indexes].has(indexName)) {
      return this[FIELDS.indexes].get(indexName)
    }

    let nativeIndex = this[FIELDS.objectStore].index(indexName)
    let index = new ReadOnlyIndex(
      nativeIndex,
      this[FIELDS.cursorConstructor],
      this[FIELDS.transactionFactory]
    )

    this[FIELDS.indexes].set(indexName, index)

    return index
  }
}
