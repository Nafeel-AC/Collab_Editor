import { Error as MongooseError } from 'mongoose';

// Custom error class for API errors
export class APIError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', {
            message: err.message,
            stack: err.stack,
            status: err.status,
            statusCode: err.statusCode
        });
    }

    // Handle specific error types
    if (err instanceof MongooseError.ValidationError) {
        const errors = Object.values(err.errors).map(el => el.message);
        return res.status(400).json({
            status: 'fail',
            error: 'Validation Error',
            message: errors.join('. ')
        });
    }

    if (err instanceof MongooseError.CastError) {
        return res.status(400).json({
            status: 'fail',
            error: 'Invalid ID',
            message: `Invalid ${err.path}: ${err.value}`
        });
    }

    if (err.code === 11000) { // Duplicate key error
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            status: 'fail',
            error: 'Duplicate Field',
            message: `${field} already exists`
        });
    }

    // Send error response
    res.status(err.statusCode).json({
        status: err.status,
        error: err.name,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}; 