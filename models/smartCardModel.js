const mongoose = require('mongoose');
const User = require('../models/userModel');

const smartCardSchema = new mongoose.Schema({
  cardNumber: String,
  expiryDate: String,
  cvv: String,
  cardHolder: String,
  balance: {
    type: Number,
    default: 0,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: function () { // set it default next day iat the current time.
      const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
      return new Date(this.startTime.getTime() + ONE_DAY_IN_MS);
    },
  },
  confirm: {
    type: Boolean,
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
});

// pre-save middleware for relations.
smartCardSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'owner',
    select: 'fullName photo',
  });
  next();
});

// Populate owner linke form userModel in smartModel.
smartCardSchema.pre('save', async function (next) {
  try {
    const owner = await User.findById(this.owner);
    this.holderName = owner.fullName;
    next();
  } catch (err) {
    next(err);
  }
});

// pre-save middlware to create random cardNumber, cvv and expiryDate.
smartCardSchema.pre('save', async function (next) {
  if (!this.cardNumber) {
    this.cardNumber = this.generateCardNumber();
  }
  if (!this.cvv) {
    this.cvv = this.generateCVV();
  }
  if (!this.expiryDate) {
    this.expiryDate = this.setExpiryDate();
  }
  next();
});

// Function to generate CardNumber.
smartCardSchema.methods.generateCardNumber = function () {
  let cardNumber = '';
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0 && i > 0) {
      cardNumber += '-';
    }
    cardNumber += Math.floor(Math.random() * 10);
  }
  return cardNumber;
};

// Function to generate cvv.
smartCardSchema.methods.generateCVV = function () {
  const cvv = Math.floor(Math.random() * 9000) + 1000; // Generate a random 4-digit number between 1000 and 9999
  return cvv;
};

// Function to generate expiryDate.
smartCardSchema.methods.setExpiryDate = function () {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const nextDay = now.getDate() + 1;
  const expiryDate = `${currentMonth < 10 ? '0' : ''}${currentMonth}/${
    nextDay < 10 ? '0' : ''
  }${nextDay}`;
  return expiryDate;
};

// Function to check if this smartCard exipred.
smartCardSchema.methods.checkAndDeleteIfExpired = async function () {
  const now = new Date();
  if (now > this.endTime) {
    await this.remove();
    return true;
  }
  return false;
};

// Check every hour for expired smartCards.
setInterval(async () => {
  const expiredSmartCards = await smartCardModel.find().exec();
  for (const smartCard of expiredSmartCards) {
    await smartCard.checkAndDeleteIfExpired();
  }
}, 60 * 60 * 1000); // Check every hour

const SmartCard = mongoose.model('SmartCard', smartCardSchema);

module.exports = SmartCard;
