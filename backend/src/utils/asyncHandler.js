const asyncHandler = (handler) => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch((err) => {
            console.error('Async Handler Error:', {
                error: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method,
                timestamp: new Date().toISOString()
            });
            
            // Handle specific error types
            if (err.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    details: err.errors
                });
            }

            if (err.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ID format',
                    code: 'INVALID_ID'
                });
            }

            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Duplicate resource',
                    code: 'DUPLICATE_RESOURCE'
                });
            }

            // Default error response
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
                ...(process.env.NODE_ENV === 'development' && { error: err.message })
            });
        });
    };
};

export default asyncHandler;
