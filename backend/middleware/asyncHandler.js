/**
 * Wraps async controller functions to handle errors automatically.
 * eliminates the need for try-catch blocks in every controller.
 * @param {Function} fn - The async controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
