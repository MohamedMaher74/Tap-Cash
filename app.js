const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const walletRouter = require('./routes/walletRoutes');
const transactionRouter = require('./routes/transactionRoutes');
const creditCardRouter = require('./routes/creditCardRoutes');
const smartCardRouter = require('./routes/smartCardRoutes');
const notificationRouter = require('./routes/notificationRoutes');

const app = express();

// 1) GLOBAL MIDDLEWARES :
app.use(cors());

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

app.use(express.json());

// ROUTES :
app.use('/api/v1/users', userRouter);
app.use('/api/v1/wallets', walletRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/creditCards', creditCardRouter);
app.use('/api/v1/smartCards', smartCardRouter);
app.use('/api/v1/notifications', notificationRouter);

app.get('/', (req, res) => {
  res.status(200).send('Hello form server side!');
});

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
