"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.keyRangeToFieldRangeObject = keyRangeToFieldRangeObject;
exports.normalizeFilter = normalizeFilter;
exports.partiallyOptimizeFilter = partiallyOptimizeFilter;
exports.compileFieldRangeFilter = compileFieldRangeFilter;
exports.compileOrderingFieldPaths = compileOrderingFieldPaths;

var _NativeDBAccessor = require("../NativeDBAccessor");

var _KeyRange = require("./KeyRange");

var _KeyRange2 = _interopRequireDefault(_KeyRange);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Converts the provided key range object into a field range map object.
 *
 * @param {IDBKeyRange} keyRange The key range object to convert.
 * @param {(string|string[])} keyPath The key path of this storage.
 * @return {Object<string, IDBKeyRange>} A field range map object.
 */
function keyRangeToFieldRangeObject(keyRange, keyPath) {
  var fieldRangeObject = {};

  if (!(keyPath instanceof Array)) {
    setFieldValue(fieldRangeObject, keyPath, keyRange);
    return fieldRangeObject;
  }

  var lowerBound = keyRange.lower;
  var upperBound = keyRange.upper;
  var lowerBoundOpen = keyRange.lowerOpen;
  var upperBoundOpen = keyRange.upperOpen;

  keyPath.forEach(function (fieldPath, index) {
    var fieldLowerBound = lowerBound ? lowerBound[index] : undefined;
    var fieldUpperBound = upperBound ? upperBound[index] : undefined;
    var fieldRange = _KeyRange2.default.bound(fieldLowerBound, fieldUpperBound, lowerBoundOpen, upperBoundOpen);
    setFieldValue(fieldRangeObject, fieldPath, fieldRange);
  });

  return fieldRangeObject;
}

/**
 * Normalizes the provided filter to an {@code undefined}, an
 * {@codelink IDBKeyRange} instance or a filter predicate function.
 *
 * @param {?(undefined|number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
 *        A filter to use, as provided by the client code.
 * @param {?(string|string[])} keyPath The key path of the storage. This
 *        parameter is used to optimize field map filters that specify a the
 *        field constraints matching the field paths - such field map filters
 *        will be optimized to an IDBKeyRange.
 * @return {(undefined|IDBKeyRange|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)}
 *         Normalized filter.
 */
function normalizeFilter(filter, keyPath) {
  if (keyPath) {
    var normalizedFilter = convertFieldMapToKeyRange(filter, keyPath);
    if (normalizedFilter) {
      filter = normalizedFilter;
    }
  }

  if (filter === null || filter === undefined) {
    return undefined;
  }

  var isFieldMap = filter instanceof Object && !(filter instanceof Function) && !(filter instanceof IDBKeyRange) && !(filter instanceof Array) && !(filter instanceof Date);
  if (isFieldMap) {
    filter = compileFieldRangeFilter(filter);
  }

  if (!(filter instanceof Function) && !(filter instanceof IDBKeyRange)) {
    filter = _KeyRange2.default.only(filter);
  }

  return filter;
}

/**
 * Attempts to convert the part of the filter object that matches the specified
 * storage key path to a key range, while compiling the remaining fields to a
 * filter predicate function.
 *
 * The method returns information on the ratio of storage key path fields
 * converted to the key range to the total number of field paths in the filter.
 *
 * @param {Object<string, (number|string|Date|Array|IDBKeyRange)>} filter A map
 *        of field names to expected values or key ranges representing the
 *        expected values for those fields.
 * @param {string[]} keyPath The key path of the storage for which the filter
 *        is to be optimized.
 * @return {{keyRange: IDBKeyRange, filter: ?function(*, (number|string|Date|Array)): boolean, score: number}}
 *         The IndexedDB key range to use with the native API, additional
 *         filtering predicate, and optimization score as a floating point
 *         number within the range [0, 1]. The score is set to 1 if all filter
 *         fields were converted to the key range, and the score is set to 0 if
 *         none of the filter fields could have been converted to the key
 *         range.
 */
function partiallyOptimizeFilter(filter, keyPath) {
  var fieldPaths = getFieldPaths(filter, false);

  var canOptimize = keyPath.every(function (path) {
    return fieldPaths.indexOf(path) > -1;
  });
  if (!canOptimize) {
    return {
      keyRange: undefined,
      filter: compileFieldRangeFilter(filter),
      score: 0
    };
  }

  if (keyPath.length === fieldPaths.length) {
    return partiallyOptimizeKeyPathMatchingFilter(filter, keyPath);
  }

  var keyPathContainsKeyRange = keyPath.some(function (fieldPath) {
    return getFieldValue(filter, fieldPath) instanceof IDBKeyRange;
  });
  if (keyPathContainsKeyRange) {
    return {
      keyRange: undefined,
      filter: compileFieldRangeFilter(filter),
      score: 0
    };
  }

  var _splitFilteringObject = splitFilteringObject(filter, fieldPaths, keyPath);

  var fieldsToOptimize = _splitFilteringObject.fieldsToOptimize;
  var fieldsToCompile = _splitFilteringObject.fieldsToCompile;

  return {
    keyRange: convertFieldMapToKeyRange(fieldsToOptimize, keyPath),
    filter: compileFieldRangeFilter(fieldsToCompile),
    score: keyPath.length / fieldPaths.length
  };
}

/**
 * A sub-routine of the {@linkcode partiallyOptimizeFilter} used to generate
 * optimization result if the storage key path matches the field paths in the
 * filter object.
 *
 * @param {Object<string, (number|string|Date|Array|IDBKeyRange)>} filter A map
 *        of field names to expected values or key ranges representing the
 *        expected values for those fields.
 * @param {string[]} keyPath The key path of the storage for which the filter
 *        is to be optimized.
 * @return {{keyRange: IDBKeyRange, filter: ?function(*, (number|string|Date|Array)): boolean, score: number}}
 *         The IndexedDB key range to use with the native API, additional
 *         filtering predicate, and optimization score as a floating point
 *         number within the range [0, 1]. The score is set to 1 if all filter
 *         fields were converted to the key range, and the score is set to 0 if
 *         none of the filter fields could have been converted to the key
 *         range.
 */
function partiallyOptimizeKeyPathMatchingFilter(filter, keyPath) {
  var keyRange = convertFieldMapToKeyRange(filter, keyPath);
  if (!keyRange) {
    // at least one of the values is a IDBKeyRange instance
    return {
      keyRange: undefined,
      filter: compileFieldRangeFilter(filter),
      score: 0
    };
  }

  return {
    keyRange: keyRange,
    filter: null,
    score: 1
  };
}

/**
 * Splits the provided filter object to two objects according the the provided
 * storage key path. This is used to separate a complex filter object into an
 * object optimizable into a key range and a simpler object that will be
 * compiled into a filter predicate function.
 *
 * @param {Object<string, *>} filter Filtering object to split.
 * @param {string[]} filterFieldPaths All field paths in the filtering object.
 * @param {string[]} storageKeyPath The key path(s) of the storage for which
 *        the filtering object is being split.
 * @return {{fieldsToOptimize: Object<string, *>, fieldsToCompile: Object<string, *>}}
 *          The {@code fieldsToOptimize} filter object will contain only the
 *          field paths specified in the {@code storageKeyPath}, while the
 *          {@code fieldsToCompile} will contain the remaining field paths of
 *          the source filter object.
 */
function splitFilteringObject(filter, filterFieldPaths, storageKeyPath) {
  var fieldsToOptimize = {};
  var fieldsToCompile = {};

  filterFieldPaths.forEach(function (fieldPath) {
    var value = getFieldValue(filter, fieldPath);
    if (storageKeyPath.indexOf(fieldPath) > -1) {
      setFieldValue(fieldsToOptimize, fieldPath, value);
    } else {
      setFieldValue(fieldsToCompile, fieldPath, value);
    }
  });

  return {
    fieldsToOptimize: fieldsToOptimize,
    fieldsToCompile: fieldsToCompile
  };
}

/**
 * Compiles the provided map of field names to expected values or value ranges
 * to a predicate function that takes a record and returns {@code true} if the
 * record satisfies the provided field values restrictions.
 *
 * @param {Object<string, (number|string|Date|Array|IDBKeyRange)>} filter A map
 *        of field names to expected values or key ranges representing the
 *        expected values for those fields.
 * @return {function(*): boolean} The compiled filter.
 */
function compileFieldRangeFilter(filter) {
  var fieldPaths = getFieldPaths(filter, false);
  var idb = (0, _NativeDBAccessor.idbProvider)();

  var fieldFilters = fieldPaths.map(function (fieldPath) {
    var fieldRange = getFieldValue(filter, fieldPath);
    if (!(fieldRange instanceof IDBKeyRange)) {
      fieldRange = _KeyRange2.default.only(fieldRange);
    }

    return function (record) {
      var fieldValue = undefined;
      try {
        fieldValue = getFieldValue(record, fieldPath);
      } catch (error) {
        return false; // the field does not exist in the record
      }

      if (fieldRange.lower !== undefined) {
        var lowerComparison = undefined;
        lowerComparison = idb.cmp(fieldRange.lower, fieldValue);

        var failedTest = lowerComparison > 0 || fieldRange.lowerOpen && lowerComparison === 0;
        if (failedTest) {
          return false;
        }
      }

      if (fieldRange.upper !== undefined) {
        var upperComparison = undefined;
        upperComparison = idb.cmp(fieldRange.upper, fieldValue);

        var failedTest = upperComparison < 0 || fieldRange.upperOpen && upperComparison === 0;
        if (failedTest) {
          return false;
        }
      }

      return true;
    };
  });

  return function (record) {
    if (!(record instanceof Object)) {
      return false;
    }

    return fieldFilters.every(function (fieldFilter) {
      return fieldFilter(record);
    });
  };
}

/**
 * Compiles the provided sequence of ordering field paths to a comparator
 * function that relies on the native {@code indexedDB.cmp} method.
 * 
 * The created comparator evaluates the field paths on the provided values in
 * the same order they were specified. The resulting values are then compared
 * using the native {@code indexedDB.cmp} method. The comparator then returns
 * the comparison, unless the values are equal - in such case the comparator
 * moves to the next field path unless there are no more field paths left.
 * 
 * @param {(string|string[])} orderingFieldPaths The field path(s) to compile
 *        into a comparator function. A field path may be prefixed by an
 *        exclamation mark ({@code "!"}) for the reverse order.
 * @return {function(*, *): number} The compiled comparator function.
 */
function compileOrderingFieldPaths(orderingFieldPaths) {
  if (typeof orderingFieldPaths === "string") {
    orderingFieldPaths = [orderingFieldPaths];
  }

  var inverted = [];
  var getters = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = orderingFieldPaths[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var fieldPath = _step.value;

      if (fieldPath.charAt(0) === "!") {
        inverted.push(true);
        getters.push(compileFieldGetter(fieldPath.substring(1)));
      } else {
        inverted.push(false);
        getters.push(compileFieldGetter(fieldPath));
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var idb = (0, _NativeDBAccessor.idbProvider)();
  var gettersCount = getters.length;

  return function (record1, record2) {
    for (var i = 0; i < gettersCount; i++) {
      var getter = getters[i];
      var value1 = getter(record1);
      var value2 = getter(record2);

      var comparison = undefined;
      if (inverted[i]) {
        comparison = idb.cmp(value2, value1);
      } else {
        comparison = idb.cmp(value1, value2);
      }

      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  };
}

/**
 * Compiles the provided field path to a function that retrieves the value of
 * the field denoted by the field path from the object passed to the function,
 * or {@code undefined} if the field does not exist in the object.
 * 
 * @param {string} fieldPath The field path to compile.
 * @return {function(*): *} The compiled field getter.
 */
function compileFieldGetter(fieldPath) {
  var fields = fieldPath.split(".");

  return function (record) {
    var value = record;

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = fields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var field = _step2.value;

        if (!(value instanceof Object) || !value.hasOwnProperty(field)) {
          return undefined;
        }

        value = value[field];
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return value;
  };
}

/**
 * Attempts to convert the provided filter to a single {@codelink IDBKeyRange}
 * instance.
 *
 * The conversion is only possible if the filter is a field map filter, field
 * paths in the object match the provided key paths exactly, and the filter
 * does not have a field set to an {@codelink IDBKeyRange} instance.
 *
 * @param {?(undefined|number|string|Date|Array|IDBKeyRange|Object<string, (number|string|Date|Array|IDBKeyRange)>|function(*, (number|string|Date|Array), (number|string|Date|Array)): boolean)} filter
 *        The filter to convert.
 * @param {(string|string[])} keyPaths The field paths representing the key in
 *        this storage.
 * @return {?IDBKeyRange} The filter represented as a single
 *         {@linkcode IDBKeyRange} instance, or {@code null} if the conversion
 *         is not possible.
 */
function convertFieldMapToKeyRange(filter, keyPaths) {
  var isOtherFormOfFilter = !(filter instanceof Object) || filter instanceof Function || filter instanceof Array || filter instanceof Date || filter instanceof IDBKeyRange;
  if (isOtherFormOfFilter) {
    return null;
  }

  if (!(keyPaths instanceof Array)) {
    keyPaths = [keyPaths];
  }

  var fieldPaths = getFieldPaths(filter);
  if (!fieldPaths) {
    return null;
  }

  var isKeyFilter = fieldPaths.length === keyPaths.length && fieldPaths.every(function (path) {
    return keyPaths.indexOf(path) > -1;
  });
  if (!isKeyFilter) {
    return null;
  }

  if (keyPaths.length === 1) {
    return IDBKeyRange.only(getFieldValue(filter, keyPaths[0]));
  }

  return new IDBKeyRange.only(keyPaths.map(function (keyPath) {
    getFieldValue(filter, keyPath);
  }));
}

/**
 * Generates an array containing all field paths in the provided object.
 *
 * The method also tests whether any of the leaf field values is an
 * {@linkcode IDBKeyRange} instance, in such case the method returns
 * {@code null}.
 *
 * The method is used to determine whether the provided object can be turned
 * into and {@linkcode IDBKeyRange} instance for a compound record key, and if
 * so, retrieve all field paths in the object so that its structure can be
 * validated against the field paths of the storage.
 *
 * @param {Object} object The object from which the field paths are to be
 *        extracted.
 * @param {boolean=} stopOnKeyRange When {@code true}, the method returns
 *        {@code null} if it encounters a key range.
 * @return {?string[]} All field paths in the provided objects, unless the
 *         object contains a field set to an {@linkcode IDBKeyRange} instance.
 */
function getFieldPaths(object) {
  var stopOnKeyRange = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

  var fieldPaths = [];
  fieldPaths.containsKeyRange = false;
  generateFieldPaths(object, []);

  return fieldPaths;

  function generateFieldPaths(object, parts) {
    Object.keys(object).some(function (fieldName) {
      var value = object[fieldName];
      if (stopOnKeyRange && value instanceof IDBKeyRange) {
        fieldPaths = null;
        return true;
      }

      var isTerminalValue = !(value instanceof Object) || value instanceof Date || value instanceof Array || value instanceof IDBKeyRange;
      var fieldPath = parts.slice();
      fieldPath.push(fieldName);

      if (isTerminalValue) {
        fieldPaths.push(fieldPath.join("."));
      } else {
        generateFieldPaths(value, fieldPath);
      }
    });
  }
}

/**
 * Sets the specified field, denoted by the specified field path, on the
 * provided object to the provided value.
 *
 * If the specified field path does not exist in the object, it is
 * automatically created by inserting new empty objects.
 *
 * @param {Object} object An object on which the field should be set.
 * @param {string} fieldPath A field path on which the value should be set. A
 *        field path is a sequence of field names joined by dots ({@code "."}).
 * @param {*} value The value to set at the specified field path.
 * @throws {Error} Thrown if the field path is already present or in a conflict
 *         with another already present field path.
 */
function setFieldValue(object, fieldPath, value) {
  var parts = fieldPath.split(".");
  var done = [];
  var currentObject = object;

  while (parts.length) {
    var field = parts.shift();

    if (!parts.length) {
      if (currentObject.hasOwnProperty(field)) {
        throw new Error("The " + fieldPath + " field seems to be already present ");
      }
      currentObject[field] = value;
      break;
    }

    if (!currentObject.hasOwnProperty(field)) {
      currentObject[field] = {};
    }

    if (!(currentObject[field] instanceof Object)) {
      throw new Error("The " + fieldPath + " field is in a conflict with the " + (done.join(".") + " field"));
    }

    currentObject = currentObject[field];

    done.push(field);
  }
}

/**
 * Retrieves the value from the provided object at the specified field path.
 *
 * @param {Object} object The object from which the field value is to be
 *        extracted.
 * @param {string} fieldPath The path to the field to retrieve, specified as a
 *        sequence of field names joined by dots ({@code "."}).
 * @return {*} The value of the specified field.
 * @throw {Error} Thrown if the field path does not exist in the provided
 *        object.
 */
function getFieldValue(object, fieldPath) {
  if (!fieldPath) {
    return object;
  }

  var currentObject = object;
  fieldPath.split(".").forEach(function (fieldName) {
    if (!currentObject.hasOwnProperty(fieldName)) {
      throw new Error("The field path " + fieldPath + " does not exist in the " + "provided object");
    }

    currentObject = currentObject[fieldName];
  });

  return currentObject;
}