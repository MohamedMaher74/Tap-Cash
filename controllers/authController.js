const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const email = require('../utils/email');
const Wallet = require('../models/walletModel');
const Notification = require('../models/notificationModel');

// Function to create token by given user.id.
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Function to send token to user in response.
const createSendToken = (user, status, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // for production environment
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  // sent tokne as a cookie.
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(status).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  // 1) Signup
  let newUser = await User.create(req.body);

  // as soon user created, create a wallet for this user.
  const wallet = await Wallet.create({ owner: newUser._id });

  // make a wallet link in newUser's data.
  newUser.wallet = wallet._id;

  await wallet.save();

  // 2) Generate the random verification code
  const code = newUser.generateVerificationCode();
  const token = signToken(newUser._id);
  await newUser.save();

  // 3) Send this verification code to newUser's Gmail.
  try {
    await email({
      email: newUser.email,
      subject: 'Tap Cash',
      message: `Your Verification code is: ${code}`,
    });

    res.status(200).json({
      status: 'success',
      message:
        'Verification code is sent to email. Please check your mail and spam folder',
      token, // send token to continue in signUp processing.
    });
  } catch (err) {
    // reseting the password reset token in case of err
    newUser.passwordResetToken = undefined;
    newUser.passwordResetExpires = undefined;
    await newUser.save();

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.verfiySignUp = catchAsync(async (req, res, next) => {
  // 1) Get user based on verification code
  const hashedResetCode = crypto
    .createHash('sha256')
    .update(req.body.code)
    .digest('hex');

  // 2) take a token.
  const currentToken = req.headers.authorization.split(' ')[1];

  // 3) Verification token by user._id.
  const decoded = await promisify(jwt.verify)(
    currentToken,
    process.env.JWT_SECRET
  );

  // 4) Check if user still exists
  let user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new AppError(
        'The token belonging to this user does not longer exist.',
        401
      )
    );
  }

  // Get this user by verfiication code and must be valid not expired.
  user = await User.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If not found.
  if (!user) {
    return next(new AppError('Reset code invalid or expired'));
  }

  // Error Case.
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;

  // 5) success case
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: 'success',
  });
});

exports.putPasswordsSignUp = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const user = await User.findById(req.user._id);

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log the user in, send JWT
  res.status(200).json({
    status: 'success',
    date: user,
  });
});

exports.resendSignUp = catchAsync(async (req, res, next) => {
  // 1) get given token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) Check token still valid.
  if (!token) {
    return next(
      new AppError('You are not logged in! please log in to get access.', 401)
    );
  }

  // 3) Verification token.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 4) Check if user still exists
  const user = await User.findById(decoded.id).select('+resendCodeCount');
  if (!user) {
    return next(
      new AppError(
        'The token belonging to this user does not longer exist.',
        401
      )
    );
  }

  // 5) Check if this user is already used resent api 3 times or more
  if (user.resendCodeCount >= 3) {
    await User.findOneAndDelete({ email: user.email });
    return next(
      new AppError(
        'You have reached the maximum number of verification code requests. Try again later',
        400
      )
    );
  }

  // 6) Generate the random reset token
  const code = user.generateVerificationCode();
  user.resendCodeCount += 1;
  await user.save();

  // 7) Send it to newUser's phoneNumber
  try {
    await email({
      email: user.email,
      subject: 'Tap Cash',
      message: `Your Verification code is: ${code}`,
    });

    res.status(200).json({
      status: 'success',
      message:
        'Verification code is sent to email. Please check your mail and spam folder',
    });
  } catch (err) {
    // 8) reseting the password reset token in case of err
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there.
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2) check if it already found.
  if (!token) {
    return next(
      new AppError('You are not logged in! please log in to get access.', 401)
    );
  }
  // 3) Verification token.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 4) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError(
        'The token belonging to this user does not longer exist.',
        401
      )
    );
  }

  req.user = freshUser;

  next();
});

// Middleware to define who can do a certain action.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Here you can login with your Gmail or nationalId.
exports.login = catchAsync(async (req, res, next) => {
  const { emailOrNationalId, password } = req.body;

  // 1) Check if email and password exist
  if (!emailOrNationalId || !password) {
    return next(
      new AppError('Please provide email or nationalId with password!', 400)
    );
  }

  // 2) Check if user exists & password is correct
  let user;
  if (emailOrNationalId.includes('@')) {
    // assume if email
    user = await User.findOne({ email: emailOrNationalId }).select('+password');
  } else {
    // assume national ID
    user = await User.findOne({ nationalId: emailOrNationalId }).select(
      '+password'
    );
  }

  // Wrong case in email or password.
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to clinet.
  createSendToken(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on email
  const user = await User.findOne({ email: req.body.email });

  // 2) If not found.
  if (!user) {
    return next(new AppError('There is no user with this email.', 404));
  }

  // 3) Generate the random reset token
  const resetCode = user.generateVerificationCode();
  const token = signToken(user._id);
  await user.save({ validateBeforeSave: false });

  // 4) Send it to user's email
  try {
    await email({
      email: user.email,
      subject: 'Tap Cash',
      message: `Your Verification code is: ${resetCode}`,
    });

    res.status(200).json({
      status: 'success',
      message:
        'Verification code is sent to email. Please check your mail and spam folder',
      token,
    });
  } catch (err) {
    // reseting the password reset token in case of err
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
  req.user = user;
});

exports.verfiyForgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on reset code
  const hashedResetCode = crypto
    .createHash('sha256')
    .update(req.body.resetCode)
    .digest('hex');

  // Get user that has same resetCode and still valid.
  const user = await User.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  // check if not found.
  if (!user) {
    return next(new AppError('Reset code invalid or expired'));
  }

  // 2) Reset code valid
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: 'success',
  });
});

exports.resetForgetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const user = await User.findById(req.user._id);

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.confirmPassword;
  user.passwordResetCode = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.resendCodeCount = 0;
  await user.save();

  // 3) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.resendForgetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on his id.
  const user = await User.findById(req.user.id).select('+resendCodeCount');

  // 2) Check if this user is already used resent api 3 times or more
  if (user.resendCodeCount >= 3) {
    return next(
      new AppError(
        'You have reached the maximum number of verification code requests. Try again later',
        400
      )
    );
  }

  // 3) Generate the random reset token
  const code = user.generateVerificationCode();
  user.resendCodeCount += 1;
  await user.save();

  // 3) Send it to newUser's phoneNumber
  try {
    await email({
      email: user.email,
      subject: 'Tap Cash',
      message: `Your Verification code is: ${code}`,
    });

    res.status(200).json({
      status: 'success',
      message:
        'Verification code is sent to email. Please check your mail and spam folder',
    });
  } catch (err) {
    // reseting the password reset token in case of err
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if posted current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) Check if current password as new password
  if (await user.correctPassword(req.body.newPassword, user.password)) {
    return next(
      new AppError('New password must be different from current password', 400)
    );
  }

  // 4) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 5) Log user in, send JWT
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.childSignUp = catchAsync(async (req, res, next) => {
  // Get parent first based on his role and nationalId.
  const parentUser = await User.findOne({
    nationalId: req.body.parentNationalId,
    role: 'parent',
  });

  // Check if already in our Data.
  if (!parentUser) {
    return next(new AppError('Parent user not found', 404));
  }

  // Create ChildUser by his father data.
  const childUser = await User.create({
    nationalId: req.body.parentNationalId,
    role: 'child',
    parent: parentUser._id, // Link the child user to the parent user
  });

  // as soon as child account created create a waaaallet
  const wallet = await Wallet.create({ owner: childUser._id });

  // Make the wallet related to child Data.
  childUser.wallet = wallet._id;

  await wallet.save();

  childUser.save();

  // Create Token
  const token = signToken(childUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: childUser,
    },
  });
});
