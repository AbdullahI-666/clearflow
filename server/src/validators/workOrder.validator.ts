import { body } from 'express-validator';

export function validateServiceDescription(desc: string): { isValid: boolean; message?: string } {
  const trimmed = (desc || '').trim();
  if (!trimmed || trimmed.length < 20) {
    return {
      isValid: false,
      message: 'Description must be at least 20 characters long. Please describe the facility problem in detail.'
    };
  }

  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) {
    return {
      isValid: false,
      message: 'Please provide a meaningful description with at least 3 descriptive words.'
    };
  }

  const uniqueChars = new Set(trimmed.toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (uniqueChars.size < 4) {
    return {
      isValid: false,
      message: 'Meaningless repetitive text rejected. Please describe the actual problem.'
    };
  }

  const letters = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length >= 8) {
    const vowels = letters.match(/[aeiou]/g) || [];
    const vowelRatio = vowels.length / letters.length;
    if (vowelRatio < 0.12 && letters.length > 10) {
      return {
        isValid: false,
        message: 'The description appears to be random text. Please describe the actual issue.'
      };
    }
  }

  return { isValid: true };
}

export const createWorkOrderValidator = [
  body('categoryId').notEmpty().withMessage('Service category is required'),
  body('locationAddress').notEmpty().withMessage('Location address is required'),
  body('description')
    .notEmpty().withMessage('Issue description is required')
    .custom((val) => {
      const res = validateServiceDescription(val);
      if (!res.isValid) {
        throw new Error(res.message);
      }
      return true;
    }),
  body('urgency').optional().isIn(['Low', 'Medium', 'High']),
  body('locationLat').optional().isNumeric(),
  body('locationLng').optional().isNumeric()
];

export const updateStatusValidator = [
  body('status').isIn([
    'Open',
    'Assigned',
    'InProgress',
    'PendingReview',
    'PendingClientConfirmation',
    'RevisionRequired',
    'Completed',
    'Closed',
    'Flagged',
    'Cancelled',
    'Declined',
    'Disputed'
  ])
];

export const ratingValidator = [
  body('stars').isInt({ min: 1, max: 5 })
];

