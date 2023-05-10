const express = require('express');
const transactioController = require('../controllers/transactionController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// Must be logged in.
router.use(authController.protect);

router
  .route('/')
  .get(transactioController.getAllTransactions)
  .post(transactioController.createTransaction);
  
router
  .route('/:transactionId')
  .get(transactioController.getTransaction);


  
module.exports = router;
