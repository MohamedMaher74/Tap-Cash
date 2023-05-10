const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0,
  },
  cashBack: {
    type: Number,
    default: 0,
  },
  limitPerTransaction: {
    type: Number,
    default: 1000,
  },
  cashWithdrawalLimit: {
    type: Number,
    default: 5000,
  },
  limitCash: {
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
walletSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'owner',
    select: 'fullName photo nationalId',
  });
  next();
});

// Simple Algorithm for caseBack, for each one thousand of balance take a cashback 15%.
walletSchema.pre('save', function (next) {
  const cashbackRate = 0.15; // 15%
  const cashbackAmount = Math.floor(this.balance / 1000) * 1000 * cashbackRate;
  this.cashback = cashbackAmount;
  next();
});

// Function to return limitCash to zero if user exceeds the number of tryings.
walletSchema.methods.resetLimitCash = function () {
  this.limitCash = 0;
  return this.save();
};

// Return each wallet to zero limitCash each 30 days.
walletSchema.statics.setLimitCashReset = function () {
  setInterval(async () => {
    const wallets = await this.find({}).exec();
    wallets.forEach(async (wallet) => {
      await wallet.resetLimitCash();
    });
  }, 30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
