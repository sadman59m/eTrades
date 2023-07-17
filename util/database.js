// const mongodb = require("mongodb");
// const MongoClient = mongodb.MongoClient;

// let _db;

// const mongoConnect = (callback) => {
//   MongoClient.connect(
//     "mongodb+srv://sadman:sadman@cluster0.m9clocs.mongodb.net/shop?retryWrites=true&w=majority"
//   )
//     .then((client) => {
//       console.log("Connected");
//       callback();
//       _db = client.db();
//     })
//     .catch((err) => {
//       console.log(err);
//       throw err;
//     });
// };

// const getDb = () => {
//   if (_db) return _db;
//   throw "No Database Found !!!";
// };

// exports.mongoConnect = mongoConnect;
// exports.getDb = getDb;
