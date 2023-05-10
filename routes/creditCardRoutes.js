const express = require('express');
const creditCardController = require('../controllers/creditCardController');
const authController = require('../controllers/authController');

const router = express.Router();

// Must be logged in.
router.use(authController.protect);

router
  .route('/')
  .post(creditCardController.addCreditCard)
  .get(creditCardController.getCreditCards);

router
  .route('/:id')
  .get(creditCardController.getCreditCard)
  .patch(creditCardController.updateCreditCard)
  .delete(creditCardController.deleteCreditCard)
  .post(creditCardController.addMoney);

module.exports = router;
