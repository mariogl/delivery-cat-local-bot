const { Schema, model } = require("mongoose");

const ChallengeSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  week: {
    type: Number,
    required: true,
  },
  number: {
    type: String,
    required: true,
  },
});

const Challenge = model("Challenge", ChallengeSchema, "challenges");

module.exports = Challenge;
