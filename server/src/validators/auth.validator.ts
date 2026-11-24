import { body } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(['Client', 'FieldTeam', 'Worker', 'worker', 'fieldteam', 'field_team', 'field', 'crew', 'technician']).withMessage('Role must be Client or FieldTeam'),
  body('phone').optional().trim(),
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ min: 2 })
    .withMessage('Email or username must be at least 2 characters long'),
  body('password').notEmpty().withMessage('Password is required'),
  body('selectedRole').optional().trim(),
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
];

export const resetPasswordValidator = [
  body().custom((value, { req }) => {
    const pass = req.body.password || req.body.newPassword;
    if (!pass || typeof pass !== 'string' || pass.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
    return true;
  }),
];
