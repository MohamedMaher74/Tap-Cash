const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router
  .route('/')
  .get(notificationController.getNotifications)
  .post(notificationController.createNotification);

router.route('/:id').patch(notificationController.markAsRead);

module.exports = router;
