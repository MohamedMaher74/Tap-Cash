const Notification = require('../models/notificationModel');
const catchAsync = require('../utils/catchAsync');

// Create a new notification
exports.createNotification = catchAsync(async (req, res, next) => {
  const { recipient, sender, message } = req.body;

  // Create a new notification object
  const notification = await Notification.create({
    recipient,
    sender,
    message,
  });

  // Return the newly created notification in the response
  res.status(201).json({
    status: 'success',
    data: {
      notification,
    },
  });
});

// Get all notifications for a user
exports.getNotificationsForUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  // Find all notifications for the specified user
  const notifications = await Notification.find({
    recipient: userId,
  }).sort({ createdAt: -1 });

  // Return the notifications in the response
  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: {
      notifications,
    },
  });
});

// Update the status of a notification
exports.updateNotificationStatus = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;
  const { status } = req.body;

  // Find the notification by ID and update its status
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { status },
    { new: true }
  );

  // Return the updated notification in the response
  res.status(200).json({
    status: 'success',
    data: {
      notification,
    },
  });
});

// Delete a notification
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;

  // Find the notification by ID and delete it
  await Notification.findByIdAndDelete(notificationId);

  // Return a success message in the response
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
