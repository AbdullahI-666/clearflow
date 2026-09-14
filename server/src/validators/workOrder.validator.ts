import { body } from 'express-validator';

export const createWorkOrderValidator = [
  body('categoryId').notEmpty().withMessage('Service category is required'),
  body('locationAddress').notEmpty().withMessage('Location address is required'),
  body('description').notEmpty().withMessage('Issue description is required'),
  body('urgency').optional().isIn(['Low', 'Medium', 'High']),
  body('locationLat').optional().isNumeric(),
  body('locationLng').optional().isNumeric()
];

export const updateStatusValidator = [
  body('status').isIn(['Open', 'Assigned', 'InProgress', 'PendingReview', 'Closed', 'Flagged'])
];

export const ratingValidator = [
  body('stars').isInt({ min: 1, max: 5 })
];
