const express = require('express');
const smartCardController = require('../controllers/smartCardController');
const authController = require('../controllers/authController');

const router = express.Router();

// Must be logged in.
router.use(authController.protect);

router
  .route('/')
  .post(smartCardController.createSmartCard)
  .get(smartCardController.getSmartCards);

router.route('/:id').get(smartCardController.getSmartCard);

module.exports = router;
