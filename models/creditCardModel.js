const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
  cardNumber: String,
  expiryDate: String,
  cvv: String,
  cardHolder: String,
  balance: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
});

// pre-save middleware for relations.
creditCardSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'owner',
    select: 'fullName photo',
  });
  next();
});

const CreditCard = mongoose.model('CreditCard', creditCardSchema);

module.exports = CreditCard;
