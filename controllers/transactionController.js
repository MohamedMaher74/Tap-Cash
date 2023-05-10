const Transaction = require('../models/transactionModel');
const Wallet = require('../models/walletModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const User = require('../models/userModel');

exports.createTransaction = catchAsync(async (req, res, next) => {
  // First get data from body.
  const {
    firstOneNationalId,
    secondOneNationalId,
    service,
    value,
    statusFirstOne,
    firstOnePin,
  } = req.body;

  // Service can be send for it like (53753) or recieve from it like (fawray)
  if (service) {
    if (statusFirstOne === 'out') {
      // Check if current user will send not recieve.
      // Then get firstUser by currentUser'id
      // Then get firstWallet by wallet Owner that equal firstOne.
      const firstUser = await User.findById(req.user.id);
      const firstWallet = await Wallet.findOne({ owner: req.user.id });

      // If firstUser is child.
      if (firstUser.role === 'child') {
        // Check if service he want to acces with, his father already given for him permission.
        if (!firstUser.items.includes(service)) {
          return next(new AppError('This service not available for you!', 403));
        }

        // check if current user balance is greater than gicen value
        if (firstWallet.balance < value) {
          return next(
            new AppError(
              `Your current balance less than required value ${value}`,
              400
            )
          );
        }

        firstWallet.balance -= value;

        // If this wallet balance became zero delete it.
        if (!firstWallet.balance) {
          await Wallet.findOneAndRemove({ owner: req.user.id });
        }

        firstUser.save();
        firstWallet.save();

        res.status(200).json({
          status: 'success',
        });
      }

      // first check if firstwallet limitCash with new given value is still less than firstWallet cashWithdrawalLimit
      if (firstWallet.limitCash + value <= firstWallet.cashWithdrawalLimit) {
        // then check if given value is less than  or equal firstWallet limitPerTransaction
        if (value <= firstWallet.limitPerTransaction) {
          // third check firstWallet balance is greater than or equal given value.
          if (firstWallet.balance >= value) {
            // in last check if logged in user pin is already the same with given pin.
            if (firstUser.pin === firstOnePin) {
              const transaction = await Transaction.create(req.body);

              firstWallet.balance -= value;
              firstWallet.limitCash += value;
              await firstWallet.save();

              res.status(201).json({
                status: 'success',
                data: {
                  transaction,
                },
              });
            } else {
              // Error, if logged in user pin is not already the same with given pin.
              return next(new AppError(`Your pin is wrong`, 400));
            }
          } else {
            // Error, if firstWallet balance is less than given value.
            return next(
              new AppError(
                `Your current balance less than required value ${value}`,
                400
              )
            );
          }
        } else {
          // Error, if given value is greater than firstWallet limitPerTransaction
          return next(
            new AppError(
              `You can not send this value ${value}, it is greater than your transaction limit ... change this limit or decrease this value.`,
              400
            )
          );
        }
      } else {
        // Error, if firstwallet limitCash with new given value is greater than firstWallet cashWithdrawalLimit
        return next(
          new AppError(
            `You have exceeded the cash withdrawal limit ... change this limit or wait for new month.`,
            400
          )
        );
      }
    } else if (statusFirstOne === 'in') {
      // Get firstWallet bt its owner who already logged in.
      const firstWallet = await Wallet.findOne({ owner: req.user.id });

      // Create a transaction.
      const transaction = await Transaction.create(req.body);

      firstWallet.balance += value;

      await firstWallet.save();

      res.status(201).json({
        status: 'success',
        data: {
          transaction,
        },
      });
    }
  } else {
    // Get first and second users by their national Ids.
    const firstUser = await User.findOne({ nationalId: firstOneNationalId });
    const secondUser = await User.findOne({ nationalId: secondOneNationalId });

    // Check if second user not found.
    if (!secondUser) {
      return next(new AppError('Not user found with this National Id', 404));
    }

    // Get first and second wallet which their owners are firstUser and secondUser.
    const firstWallet = await Wallet.findOne({ owner: firstUser }).populate(
      'owner'
    );
    const secondWallet = await Wallet.findOne({ owner: secondUser }).populate(
      'owner'
    );

    // as last testCases.
    if (firstWallet.limitCash + value <= firstWallet.cashWithdrawalLimit) {
      if (value <= firstWallet.limitPerTransaction) {
        if (firstUser.id == req.user.id) {
          if (statusFirstOne == 'out') {
            if (firstWallet.balance >= value) {
              if (firstUser.pin === firstOnePin) {
                let transaction = await Transaction.create(req.body);

                transaction.secondOne = secondUser.id;

                firstWallet.balance -= value;
                secondWallet.balance += value;
                firstWallet.limitCash += value;

                await transaction.save();
                await firstWallet.save();
                await secondWallet.save();

                res.status(201).json({
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
                new AppError(
                  `Your balance less than required value ${value}`,
                  400
                )
              );
            }
          }
        } else {
          return next(
            new AppError(`You are not authorized to do this action`, 403)
          );
        }
      } else {
        return next(
          new AppError(
            `You can not send this value ${value}, it is greater than your transaction limit ... change this limit or decrease this value.`,
            400
          )
        );
      }
    } else {
      return next(
        new AppError(
          `You have exceeded the cash withdrawal limit ... change this limit or wait for new month.`,
          400
        )
      );
    }
  }
});

// Get All transactions and allow to do all forms of query searching.
exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Transaction.find({
      $or: [
        { firstOneNationalId: req.user.nationalId },
        { secondOneNationalId: req.user.nationalId },
      ],
    }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const transactions = await features.query;

  res.status(200).json({
    status: 'success',
    result: transactions.length,
    data: {
      transactions,
    },
  });
});

// Get a certain Transaction by its id.
exports.getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.transactionId);

  if (!transaction) {
    return next(new AppError('No transaction found with this Id', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      transaction,
    },
  });
});
