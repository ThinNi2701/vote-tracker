const mongoose = require('mongoose');
const crypto = require('crypto');

const ballotSchema = new mongoose.Schema(
  {
    ballotNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    crossedOut: {
      type: [String],
      default: [],
    },
    selected: {
      type: [String],
      default: [],
    },
    isValid: {
      type: Boolean,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const electionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
    },
    picksAllowed: {
      type: Number,
      required: true,
      min: 1,
    },
    candidates: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one candidate is required.',
      },
    },
    ballots: {
      type: [ballotSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model('Election', electionSchema);
