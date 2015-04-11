
import DatabaseMigrator from "../../compiled/migration/DatabaseMigrator"
import DatabaseSchema from "../../compiled/schema/DatabaseSchema"
import DBFactory from "../../compiled/DBFactory"
import ObjectStoreSchema from "../../compiled/schema/ObjectStoreSchema"
import UpgradedDatabaseSchema
    from "../../compiled/schema/UpgradedDatabaseSchema"

describe("DatabaseMigrator", () => {
  
  const DB_NAME = "testing database"
  
  afterEach((done) => {
    let request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = done
    request.onerror = () => fail(request.error)
  })
  
  function connectForUpgrade(version = 2) {
    return new Promise((resolve, reject) => {
      let request = indexedDB.open(DB_NAME, version)
      request.onerror = reject
      request.onblocked = reject
      request.onupgradeneeded = () => {
        resolve({
          database: request.result,
          transaction: request.transaction,
          request: request
        })
      }
    })
  }
  
  it("should do nothing if the db version is the greatest described", () => {
    let migrator = new DatabaseMigrator(null, null, [
      new DatabaseSchema(1),
      new UpgradedDatabaseSchema(2, [], [])
    ], 2)
    
    migrator.executeMigration()
  })
  
  it("should perform database creation and upgrade", (done) => {
    connectForUpgrade().then((connection) => {
      let { database, transaction, request } = connection
      
      let migrator = new DatabaseMigrator(database, transaction, [
        new DatabaseSchema(1,
          new ObjectStoreSchema("fooBar", null, false)
        ),
        new UpgradedDatabaseSchema(2, [], [
          new ObjectStoreSchema("fooBar2", null, false)
        ])
      ], 0)
      
      migrator.executeMigration()
      
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result)
      })
    }).then((database) => {
      let objectStores = Array.from(database.objectStoreNames)
      expect(objectStores).toEqual(["fooBar2"])
      
      database.close()
      
      done()
    }).catch(error => fail(error))
  })
  
  it("should allow data migration", (done) => {
    connectForUpgrade(1).then((connection) => {
      let { database, transaction, request } = connection
      
      let migrator = new DatabaseMigrator(database, transaction, [
        new DatabaseSchema(1,
          new ObjectStoreSchema("fooBar", null, true)
        )
      ], 0)
      
      migrator.executeMigration()
      
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result)
      })
    }).then((database) => {
      let transaction = database.transaction("fooBar", "readwrite")
      let objectStore = transaction.objectStore("fooBar")
      
      return new Promise((resolve) => {
        let request = objectStore.add("this is OK")
        request.onsuccess = () => {
          request = objectStore.add("skip")
          request.onsuccess = () => {
            request = objectStore.add("delete")
            request.onsuccess = () => {
              request = objectStore.add({ someField: "this is also OK" })
              request.onsuccess = () => {
                transaction.oncomplete = () => {
                  database.close()
        
                  resolve(connectForUpgrade(2))
                }
              }
            }
          }
        }
      })
    }).then((connection) => {
      let { database, transaction, request } = connection
      
      let migrator = new DatabaseMigrator(database, transaction, [
        new DatabaseSchema(1,
          new ObjectStoreSchema("fooBar", null, true)
        ),
        new UpgradedDatabaseSchema(2, [
            {
              objectStore: "fooBar",
              preprocessor(record, key) {
                if (record === "skip") {
                  return UpgradedDatabaseSchema.SKIP_RECORD
                }
                if (record === "delete") {
                  return UpgradedDatabaseSchema.DELETE_RECORD
                }
                return record
              }
            }
          ], [
            new ObjectStoreSchema("fooBar")
          ], (transaction, records) => {
            expect(records).toEqual({
              fooBar: [
                {
                  key: 1,
                  record: "this is OK"
                },
                {
                  key: 4,
                  record: {
                    someField: "this is also OK"
                  }
                }
              ]
            })
            
            return new Promise((resolve) => {
              let objectStore = transaction.getObjectStore("fooBar")
              
              resolve(objectStore.add({ anotherField: "another value" }))
            })
          }
        )
      ], 1)
      
      return migrator.executeMigration().then(() => {
        return new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result)
        })
      })
    }).then((database) => {
      let transaction = database.transaction("fooBar")
      let objectStore = transaction.objectStore("fooBar")
      
      return new Promise((resolve, reject) => {
        let request = objectStore.count()
        request.onsuccess = () => resolve({
          database: database,
          count: request.result
        })
        request.onerror = () => reject(request.error)
      })
    }).then((state) => {
      let { database, count } = state
      
      expect(count).toBe(4)
      
      let transaction = database.transaction("fooBar")
      let objectStore = transaction.objectStore("fooBar")
      
      let request = objectStore.get(5)
      request.onsuccess = () => {
        let record = request.result
        expect(record).toEqual({ anotherField: "another value" })
        
        database.close()
      
        done()
      }
      request.onerror = () => fail(request.error)
    }).catch(error => fail(error))
  })
  
  it("should allow usage of plain objects as schema descriptors", (done) => {
    DBFactory.open(DB_NAME, {
      version: 1,
      objectStores: [
        {
          name: "fooBar",
          keyPath: null,
          autoIncrement: true,
          indexes: [
            {
              name: "some index",
              keyPath: "id",
              unique: false,
              multiEntry: true
            }
          ]
        }
      ]
    }, {
      version: 2,
      fetchBefore: [],
      objectStores: [
        {
          name: "fooBar2"
        }
      ],
      after: () => {}
    }).then((database) => {
      database.close()
      done()
    }).catch(error => fail(error))
  })
  
})
