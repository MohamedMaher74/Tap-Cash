const SmartCard = require('../models/smartCardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.createSmartCard = catchAsync(async (req, res, next) => {
  // creating a new smart card.
  const smartCard = await SmartCard.create({
    balance: req.body.balance,
    confirm: req.body.confirm,
    owner: req.user.id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      smartCard,
    },
  });
});

exports.getSmartCards = catchAsync(async (req, res, next) => {
  // Get All smartCards and allow to do all forms of query searching.
  const features = new APIFeatures(
    SmartCard.find({ owner: req.user._id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const smartCards = await features.query;

  res.status(200).json({
    status: 'success',
    result: smartCards.length,
    data: {
      smartCards,
    },
  });
});

exports.getSmartCard = catchAsync(async (req, res, next) => {
  // Get a certain smartCard by its id.
  const smartCard = await SmartCard.findById(req.params.id);

  if (!smartCard) {
    return next(new AppError('No smart card with this Id', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      smartCard,
    },
  });
});
