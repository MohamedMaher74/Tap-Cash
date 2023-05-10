const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const CreditCard = require('../models/creditCardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get current user wallet by its owner who already logged in.
exports.getCurrentUserWallet = catchAsync(async (req, res, next) => {
  const wallet = await Wallet.findOne({ owner: req.user._id }).populate(
    'owner'
  );

  res.status(200).json({
    status: 'success',
    data: {
      wallet,
    },
  });
});

// Update limits for user wallet.
exports.updateLimits = catchAsync(async (req, res, next) => {
  const { limitPerTransaction, cashWithdrawalLimit } = req.body;

  const updatedWallet = await Wallet.findOneAndUpdate(
    { owner: req.user._id },
    { limitPerTransaction, cashWithdrawalLimit },
    { new: true, runValidators: true }
  ).populate('owner');

  res.status(200).json({
    status: 'success',
    data: {
      updatedWallet,
    },
  });
});

// Function to send money from wallet to a certain creditCard.
exports.withdraw = catchAsync(async (req, res, next) => {
  // Get wallet by its owner who already logged in.
  const wallet = await Wallet.findOne({ owner: req.user._id }).populate(
    'owner'
  );

  // Get wanted creditCard by its id.
  const creditCard = await CreditCard.findById(req.params.id);

  // check if not found.
  if (!creditCard) {
    return next(new AppError('No creditcard with this Id!', 404));
  }

  const { value, pin } = req.body;
  // Validators as as the last.
  if (wallet.balance >= value) {
    if (req.user.pin === pin) {
      wallet.balance -= value;
      creditCard.balance += value;

      // Create a transaction of whis sending.
      const transaction = await Transaction.create({
        itemSender: 'Wallet',
        itemReciever: 'CreditCard',
        value,
      });

      await wallet.save();
      await creditCard.save();

      res.status(200).json({
        status: 'success',
        data: {
          transaction,
        },
      });
    } else {
      return next(new AppError(`Your pin is wrong`, 400));
    }
  } else {
    return next(
      new AppError(`Creditcard balance less than required value ${value}`, 400)
    );
  }
});
