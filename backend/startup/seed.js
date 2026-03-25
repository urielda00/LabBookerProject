const User = require('../models/User');

const seedRootUser = async () => {
  try {
    // Check if a root user already exists
    const rootExists = await User.findOne({ role: 'root' });
    
    if (rootExists) {
      // Success logs are usually hidden in production to keep logs clean
      if (process.env.NODE_ENV !== 'production') {
        console.log("Root user already exists, skipping seed");
      }
      return;
    }

    // Get root email from environment variables
    const rootEmail = process.env.ROOT_EMAIL;

    // Validation for ROOT_EMAIL
    if (!rootEmail) {
      if (process.env.NODE_ENV === 'production') {
        // Fatal error message without stack trace for security
        console.error("FATAL ERROR: ROOT_EMAIL is not defined in environment variables.");
        process.exit(1); 
      }
      console.warn("ROOT_EMAIL missing in environment, skipping root seed.");
      return;
    }

    // Create the Root User without a password (OTP based)
    await User.create({
      username: 'root_admin',
      email: rootEmail,
      name: 'System Root',
      role: 'root',
    });

    console.log(`Root user created successfully: ${rootEmail}`);
  } catch (error) {
    // Environment-aware error logging
    if (process.env.NODE_ENV !== 'production') {
      // Development: Full debug info including stack trace
      console.error("Error during root user seeding:", error);
    } else {
      // Production: Log only sanitized error message
      console.error("Error during root user seeding:", error.message);
      process.exit(1); // Ensure server doesn't run without a root in production
    }
  }
};

module.exports = seedRootUser;