const CreditCard = require('../models/creditCardModel');
const Wallet = require('../models/walletModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const Transaction = require('../models/transactionModel');

exports.addCreditCard = catchAsync(async (req, res, next) => {
  // Get data about creditCard.
  const { cardNumber, expiryDate, cvv, cardHolder } = req.body;

  // Create new CreditCard.
  const creditCard = await CreditCard.create({
    owner: req.user._id,
    cardNumber,
    expiryDate,
    cvv,
    cardHolder,
  });

  res.status(201).json({
    status: 'success',
    data: {
      creditCard,
    },
  });
});

exports.getCreditCards = catchAsync(async (req, res, next) => {
  // Get All creditCards and allow to do all forms of query searching.
  const features = new APIFeatures(
    CreditCard.find({ owner: req.user._id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const creditCards = await features.query;

  res.status(200).json({
    status: 'success',
    result: creditCards.length,
    data: {
      creditCards,
    },
  });
});

exports.getCreditCard = catchAsync(async (req, res, next) => {
  // Get a certain creditCard by its id.
  const creditCard = await CreditCard.findById(req.params.id);

  // Check if it's not found.
  if (!creditCard) {
    return next(new AppError('No credit card with this Id', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      creditCard,
    },
  });
});

exports.updateCreditCard = catchAsync(async (req, res, next) => {
  // Here we can update in a certain creditCard by its data, but allow updating in some categories like (cardHolder).
  const updatedCreditCard = await CreditCard.findByIdAndUpdate(
    req.params.id,
    {
      cardHolder: req.body.cardHolder,
    },
    {
      // To show us the new data, and before that run validators if found.
      new: true,
      runValidators: true,
    }
  );

  // to save new data after updating.
  updatedCreditCard.save();

  res.status(200).json({
    status: 'success',
    data: {
      updatedCreditCard,
    },
  });
});

exports.deleteCreditCard = catchAsync(async (req, res, next) => {
  // Delete a certain creditCard by its data.
  await CreditCard.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// This function is used to send send money from a ceratin creditCard to user's wallet.
exports.addMoney = catchAsync(async (req, res, next) => {
  // Get the wallet by it's owner equal current user already logged in.
  const wallet = await Wallet.findOne({ owner: req.user._id }).populate(
    'owner'
  );
  
  // Get creditCard by it's id that already given in Url. 
  const creditCard = await CreditCard.findById(req.params.id);

  // If it is not found.
  if (!creditCard) {
    return next(new AppError('No creditcard with this Id!', 404));
  }

  // Already given value and pin from user.
  const { value, pin } = req.body;

  // Check if balance of this ceditCard is greater than value. 
  if (creditCard.balance >= value) {
    // Then check if current user pin is equal given pin.
    if (req.user.pin === pin) {
      wallet.balance += value;
      creditCard.balance -= value;

      // Create a transaction of this sending.
      const transaction = await Transaction.create({
        itemSender: 'CreditCard',
        itemReciever: 'Wallet',
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
      // Error, if current user pin not equal given pin.
      return next(new AppError(`Your pin is wrong`, 400));
    }
  } else {
    // Error, if current user wallet balance is less than given value. 
    return next(
      new AppError(`Creditcard balance less than required value ${value}`, 400)
    );
  }
});
