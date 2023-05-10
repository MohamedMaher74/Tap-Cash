const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
    },
    nickName: {
      type: String,
    },
    nationalId: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
    },
    age: {
      type: String,
    },
    city: String,
    birthDate: String,
    password: {
      type: String,
      select: false,
    },
    passwordConfirm: {
      type: String,
      validate: {
        // validator to check if password as same as passwordConfirm
        validator: function (el) {
          return el === this.password;
        },
        // Error Case
        message: 'Passwords are not the same!',
      },
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    pin: String,
    parent: {
      // Link to user
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['parent', 'child'],
    },
    items: [String], // for child
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    resendCodeCount: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual Populate
userSchema.virtual('wallet', {
  ref: 'Wallet',
  foreignField: 'owner',
  localField: '_id',
});

// pre-save middleware for relations.
userSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'parent',
    select: 'fullName photo nationalId',
  });
  next();
});

// pre-save middlware to encrypt password if modified.
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;

  next();
});

// pre-save middlware to encrypt password if new.
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Function to check given password and current password in login processing.
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Function to help last time to update password.
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Function to create a verification code 4 digits to send in signUp and forgetPassword processings.
userSchema.methods.generateVerificationCode = function () {
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  this.passwordResetCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return code;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
