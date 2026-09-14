import { body } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('role').isIn(['Client', 'FieldTeam', 'Admin']).withMessage('Role must be Client, FieldTeam, or Admin'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
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
