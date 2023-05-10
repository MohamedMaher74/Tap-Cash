const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const multer = require('multer');
const sharp = require('sharp');
const CreditCard = require('../models/creditCardModel');
const SmartCard = require('../models/smartCardModel');

// This function defines a memory storage engine for Multer, which will store the uploaded files as Buffer objects in memory.
const multerStorage = multer.memoryStorage();

// This function checks if the uploaded file is an image by examining its MIME type.
// If it is an image, it passes control to the next middleware function using the cb callback function with the first argument as null.
// If it is not an image, it throws an error with an error message using the cb callback function with the first argument as an instance of the AppError class and the second argument as false.
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

//This function is a middleware function that uses Multer to handle a single file upload with the field name photo.
// It uses the upload object created by Multer, which is configured with the multerStorage and multerFilter functions.

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
// This function is a middleware function that uses Multer to handle a single file upload with the field name photo.
exports.uploadUserPhoto = upload.single('photo');

// This function is a middleware function that resizes and compresses the uploaded image file.
// It checks if there is a file uploaded by checking if the req.file object exists. If not, it passes control to the next middleware function using the next function.
// If there is a file uploaded, it renames the file to include the user ID and current timestamp, and sets the filename property of the req.file object to the new filename.
// It uses the sharp library to resize the image to 500x500 pixels, convert it to JPEG format with a quality of 90, and write it to the photos directory with the new filename.
// It passes control to the next middleware function using the next function.
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`photos/${req.file.filename}`);

  next();
});

// Get All Users and allow to do all forms of query searching.
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const users = await features.query;

  res.status(200).json({
    status: 'success',
    result: users.length,
    data: {
      users,
    },
  });
});

// Get current User data.
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate('wallet');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Function to filter unwanted names that are not allowed to be uploaded.
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body);

  // check if there is an image file to upload.
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  let updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // upload new data.
  updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      fullName: req.body.fullName,
      nickName: req.body.nickName,
      phoneNumber: req.body.phoneNumber,
      nationalId: req.body.nationalId,
      birthDate: req.body.birthDate,
      gender: req.body.gender,
      age: req.body.age,
      city: req.body.city,
      pin: req.body.pin,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  // given role to user by his age.
  updatedUser.role = updatedUser.age >= 16 ? 'parent' : 'child';

  updatedUser.save();

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// If you delete user his wallet, creditCards and smartCards will be deleted.
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.user.id);
  await Wallet.findOneAndDelete({ owner: req.user.id });
  await CreditCard.deleteMany({ owner: req.user.id });
  await SmartCard.deleteMany({ owner: req.user.id });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Function to upload data about child user.
exports.childUpdate = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body);

  if (req.file) filteredBody.photo = req.file.filename;

  const { fullName, items, balance } = req.body;

  const chidlUser = await User.findByIdAndUpdate(
    req.user._id,
    { fullName, items, balance },
    { new: true, runValidators: true }
  );

  chidlUser.save();

  res.status(200).json({
    status: 'success',
    data: {
      user: chidlUser,
    },
  });
});
