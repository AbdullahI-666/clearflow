import { body } from 'express-validator';

export const createTeamValidator = [
  body('name').notEmpty().withMessage('Team name is required'),
  body('categoryId').optional(),
  body('zoneLat').optional().isNumeric(),
  body('zoneLng').optional().isNumeric(),
];

export const updateTeamValidator = [
  body('name').optional().notEmpty(),
  body('zoneLat').optional().isNumeric(),
  body('zoneLng').optional().isNumeric(),
  body('zoneRadiusKm').optional().isNumeric(),
];
