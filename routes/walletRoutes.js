const express = require('express');
const authController = require('../controllers/authController');
const walletController = require('../controllers/walletController');

const router = express.Router();

router.use(authController.protect); // Must be logged in.

router
  .route('/')
  .get(walletController.getCurrentUserWallet)
  .patch(walletController.updateLimits);

router.route('/:id').post(walletController.withdraw);

module.exports = router;
