import { body, param, validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: any, res: any, next: any) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }
    next();
  };
};

export const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 10 })
    .withMessage('Password must be at least 10 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain a special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const vehicleValidation = [
  body('registrationNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Registration must be 3-20 characters')
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Registration can only contain uppercase letters, numbers, and hyphens'),
  body('make')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Make must be 2-50 characters'),
  body('model')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Model must be 2-50 characters'),
  body('currentMileage')
    .optional()
    .isInt({ min: 0, max: 999999 })
    .withMessage('Mileage must be between 0 and 999999'),
  body('serviceInterval')
    .optional()
    .isInt({ min: 1000, max: 50000 })
    .withMessage('Service interval must be between 1000 and 50000 miles'),
  body('insuranceExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid insurance expiry date'),
  body('registrationExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration expiry date'),
  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'electric', 'hybrid'])
    .withMessage('Invalid fuel type'),
  body('fuelEfficiency')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Fuel efficiency must be between 0 and 100'),
];

export const assignVehicleValidation = [
  body('assignedUserId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid user ID'),
];

export const checkoutValidation = [
  body('vehicleId').isUUID().withMessage('Invalid vehicle ID'),
  body('destination')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Destination must be 2-255 characters'),
  body('currentMileage')
    .isInt({ min: 0, max: 999999 })
    .withMessage('Valid mileage required'),
  body('purpose')
    .optional()
    .isIn(['business', 'personal', 'maintenance'])
    .withMessage('Purpose must be business, personal, or maintenance'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
];

export const checkinValidation = [
  param('id').isUUID().withMessage('Invalid trip ID'),
  body('endMileage')
    .isInt({ min: 0, max: 999999 })
    .withMessage('Valid end mileage required'),
];

export const serviceValidation = [
  body('vehicleId').isUUID().withMessage('Invalid vehicle ID'),
  body('serviceType')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service type must be 2-100 characters'),
  body('mileageAtService')
    .isInt({ min: 0, max: 999999 })
    .withMessage('Valid mileage required'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long'),
];

export const uuidParam = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const profileValidation = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
];

export const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter'),
];
