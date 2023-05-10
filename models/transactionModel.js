const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  firstOneNationalId: String,
  secondOneNationalId: String,
  secondOne: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  service: {
    type: String,
  },
  value: {
    type: Number,
    min: [1, 'Value must be greater than or equal to 1'],
  },
  statusFirstOne: {
    type: String,
    enum: ['in', 'out'],
  },
  statusSecondOne: {
    type: String,
    enum: ['in', 'out'],
  },
  firsstOnePin: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  itemSender: {
    type: String,
    enum: ['Wallet', 'CreditCard'],
  },
  itemReciever: {
    type: String,
    enum: ['Wallet', 'CreditCard'],
  },
});

// pre-save middleware for relations.
transactionSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'secondOne',
    select: 'fullName photo nationalId',
  });
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
