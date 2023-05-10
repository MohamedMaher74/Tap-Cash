const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const transactionRouter = require('../routes/transactionRoutes');

const router = express.Router();

router.use('/transactions', transactionRouter);

router.post('/signup', authController.signUp);

router.post('/verfiySignUp', authController.verfiySignUp);

router.post('/resendSignup', authController.resendSignUp);

router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);

router.post('/verfiyForgotPassword', authController.verfiyForgotPassword);

router.post('/resendForgetPassword', authController.resendForgetPassword);

router.post('/childSignUp', authController.childSignUp);

router.use(authController.protect); // Must be logged in.

router.post('/putPasswordsSignUp', authController.putPasswordsSignUp);

router.patch('/resetForgetPassword', authController.resetForgetPassword);

router.patch('/updateMyPassword', authController.updateMyPassword);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);

router.patch(
  '/childUpdate',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.childUpdate
);

router.route('/').get(userController.getMe);

module.exports = router;
