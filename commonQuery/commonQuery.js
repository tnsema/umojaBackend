//const model = require("../model/model");

// commonQuery/commonQuery.js  (ESM)
import crypto from "crypto";
import Models from "../model/model.js";

// If your registry uses capitalized keys (User, Role, ClientKYC) or singular names,
// this resolver keeps your old calls like "user", "role", "clientKYC" working.
const getModel = (collection) => {
  if (Models[collection]) return Models[collection];
  const cap = collection.charAt(0).toUpperCase() + collection.slice(1);
  if (Models[cap]) return Models[cap];
  const singular = collection.endsWith("s")
    ? collection.slice(0, -1)
    : collection;
  if (Models[singular]) return Models[singular];
  const capSing = singular.charAt(0).toUpperCase() + singular.slice(1);
  if (Models[capSing]) return Models[capSing];
  throw new Error(`Model not found for key: ${collection}`);
};

export const AsyncInsert = async (collection, data) => {
  const M = getModel(collection);
  const create = new M(data);
  const results = await create.save();
  return results;
};

export function Insert(collection, data, callback) {
  const M = getModel(collection);
  const create = new M(data);
  create.save(function (err, response) {
    callback(err, response);
  });
}

export const AsyncFind = async (
  collection,
  query,
  project,
  sort_skip_limit,
  callback
) => {
  const M = getModel(collection);
  const results = await M.find(query, project, sort_skip_limit);
  return results;
};

export function Find(collection, query, project, sort_skip_limit, callback) {
  const M = getModel(collection);
  M.find(query, project, sort_skip_limit, function (err, response) {
    return response;
    // callback(err, response);
  });
}

export const AsyncAggregation = async (collection, query) => {
  const M = getModel(collection);
  const results = await M.aggregate(query);
  return results;
};

export function Aggregation(collection, query, callback) {
  const M = getModel(collection);
  M.aggregate(query, function (err, response) {
    callback(err, response);
  });
}

export const AsyncAggregationExplain = async (collection, query) => {
  const M = getModel(collection);
  const results = await M.aggregate(query).explain();
  return results;
};

export function AggregationExplain(collection, query, callback) {
  const M = getModel(collection);
  M.aggregate(query, function (err, response) {
    callback(err, response);
  });
}

export const AsyncfindOne = async (collection, query, project) => {
  const M = getModel(collection);
  const results = await M.findOne(query, project);
  return results;
};

export function findOne(collection, query, project, callback) {
  const M = getModel(collection);
  M.findOne(query, project, function (err, response) {
    callback(err, response);
  });
}

// (kept placeholder to match your API)
export const AsyncfindByIdAndUpdate = async (collection, query, project) => {};

export function findByIdAndUpdate(collection, id, update, newdata, callback) {
  const M = getModel(collection);
  M.findByIdAndUpdate(id, update, newdata, function (err, response) {
    callback(err, response);
  });
}

export const AsyncfindOneAndUpdate = async (
  collection,
  condition,
  update,
  newdata,
  callback
) => {
  const M = getModel(collection);
  const results = await M.findOneAndUpdate(
    condition,
    { $set: update },
    newdata
  );
  return results;
};

export function findOneAndUpdate(
  collection,
  condition,
  update,
  newdata,
  callback
) {
  const M = getModel(collection);
  M.findOneAndUpdate(
    condition,
    { $set: update },
    newdata,
    function (err, response) {
      callback(err, response);
    }
  );
}

export function update(collection, condition, update, multi, callback) {
  const M = getModel(collection);
  M.update(condition, update, multi, function (err, response) {
    callback(err, response);
  });
}

export const AsyncdeleteOne = async (collection, query, project) => {
  const M = getModel(collection);
  const results = await M.deleteOne(query);
  return results;
};

export const AsyncDeleteEmail = async (collection, id) => {
  try {
    const uniqueHash = crypto
      .createHash("sha256")
      .update(`${collection}-${id}-${Date.now()}`)
      .digest("hex");

    const fakeEmail = `deleted_${uniqueHash}@noemail.com`;
    const M = getModel(collection);

    const result = await M.updateOne(
      { _id: id },
      { $set: { email: fakeEmail } }
    );
    return result;
  } catch (error) {
    console.error("Error in AsyncDeleteEmail:", error);
    throw error;
  }
};

export function deleteOne(collection, condition, callback) {
  const M = getModel(collection);
  M.deleteOne(condition, function (err, response) {
    callback(err, response);
  });
}

export const Asyncremove = async (collection, query, project) => {
  const M = getModel(collection);
  const results = await M.remove(query);
  return results;
};

export function remove(collection, condition, callback) {
  const M = getModel(collection);
  M.remove(condition, function (err, response) {
    callback(err, response);
  });
}

export const Asynccount = async (collection, query, project) => {
  const M = getModel(collection);
  const results = await M.count(query);
  return results;
};

export function count(collection, condition, callback) {
  const M = getModel(collection);
  M.count(condition, function (err, response) {
    callback(err, response);
  });
}

export const AsyncInsertMany = async (collection, data) => {
  const M = getModel(collection);
  const results = await M.insertMany(data);
  return results;
};

export const AsyncUpdateMany = async (collection, query, update, options) => {
  const M = getModel(collection);
  const results = await M.updateMany(query, update, options);
  return results;
};

export const AsynccountDocuments = async (collection, query) => {
  const M = getModel(collection);
  const results = await M.countDocuments(query);
  return results;
};

export function countDocuments(collection, condition, callback) {
  const M = getModel(collection);
  M.countDocuments(condition, function (err, response) {
    callback(err, response);
  });
}

export const AsyncdeleteMany = async (collection, data) => {
  const M = getModel(collection);
  const results = await M.deleteMany(data);
  return results;
};

export const AsyncUpdateOne = async (collection, query, update) => {
  const M = getModel(collection);
  const results = await M.updateOne(query, update);
  return results;
};

export const AsyncBulkWrite = async (collection, query) => {
  const M = getModel(collection);
  const results = await M.bulkWrite(query);
  return results;
};

export const AsyncDistinct = async (
  collection,
  field,
  condition = {},
  callback
) => {
  try {
    const M = getModel(collection);
    const results = await M.distinct(field, condition);
    if (callback) callback(null, results);
    return results;
  } catch (error) {
    if (callback) callback(error, null);
    throw error;
  }
};

export const AsyncFindOneById = async (collection, id, project = {}) => {
  if (!id) return null;
  const M = getModel(collection);
  const result = await M.findById(id, project);
  return result;
};

export const FindOneById = (collection, id, project = {}, callback) => {
  const M = getModel(collection);
  M.findById(id, project, (err, result) => {
    callback(err, result);
  });
};

// Optional: keep a default export with the same shape you had before
export default {
  AsyncAggregation,
  Aggregation,
  AsyncfindOne,
  findOne,
  AsyncInsert,
  Insert,
  Find,
  findByIdAndUpdate,
  AsyncfindOneAndUpdate,
  update,
  findOneAndUpdate,
  AsyncdeleteOne,
  deleteOne,
  Asynccount,
  count,
  Asyncremove,
  remove,
  AsyncAggregationExplain,
  AggregationExplain,
  AsyncFind,
  AsyncInsertMany,
  AsynccountDocuments,
  countDocuments,
  AsyncUpdateMany,
  AsyncdeleteMany,
  AsyncUpdateOne,
  AsyncBulkWrite,
  AsyncDistinct,
  AsyncFindOneById,
  FindOneById,
  AsyncDeleteEmail,
};
