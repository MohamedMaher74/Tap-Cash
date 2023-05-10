const AppError = require('../utils/appError');

// handles errors that occur when casting a value to a specific type fails. It returns a 400 Bad Request error with a message that includes the name of the field and the invalid value.
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

// handles errors that occur when inserting a document with a duplicate field value that has a unique index. It extracts the duplicate value from the error message and returns a 400 Bad Request error with a message that includes the duplicate value.
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  // console.log(value);

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// handles errors that occur when validating a document against a schema. It extracts the validation error messages from the errors object and returns a 400 Bad Request error with a message that includes the error messages concatenated with a dot.
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// function creates a new AppError with the message "Invalid token. Please log in again!" and a status code of 401 if there is an error with the JSON web token.
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

// unction creates a new AppError with the message "Your token has expired! Please log in again." and a status code of 401 if the JSON web token has expired.
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// function sends an error response in development environment with detailed error information including the error stack trace.
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// function sends an error response in production environment. If the error is an operational error, it sends a message to the client with the error message and status code. If it is a programming or unknown error, it logs the error and sends a generic message "Something went very wrong!" with a status code of 500.
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

// Handling last errors in one function.
module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, res);
  }
};
