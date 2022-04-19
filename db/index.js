const mongoose = require("mongoose");

const connectDB = (connectionString) =>
  new Promise((resolve, reject) => {
    mongoose.set("debug", false);
    mongoose.set("toJSON", {
      virtuals: true,
      transform: (doc, ret) => {
        const newRet = { ...ret };
        delete newRet.__v;
        delete newRet._id;
        return newRet;
      },
    });
    mongoose.connect(connectionString, (error) => {
      if (error) {
        return reject(error);
      }
      return resolve();
    });
  });

module.exports = connectDB;
