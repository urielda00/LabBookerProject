const User = require('../models/User');

const seedRootUser = async () => {
  try {
    // Check if a root user already exists
    const rootExists = await User.findOne({ role: 'root' });
    
    if (rootExists) {
      console.log("Root user already exists, skipping seed");
      return;
    }

    // Get root email from environment variables
    const rootEmail = process.env.ROOT_EMAIL;

    // Validation
    if (!rootEmail) {
      if (process.env.NODE_ENV === 'production') {
        console.error("FATAL ERROR: ROOT_EMAIL is not defined in environment variables.");
        process.exit(1); // Stop server in production if root email is missing
      }
      console.warn("ROOT_EMAIL missing in environment, skipping root seed.");
      return;
    }

    // Create the Root User without a password (OTP)
    await User.create({
      username: 'root_admin',
      email: rootEmail,
      name: 'System Root',
      role: 'root',
    });

    console.log(`Root user created successfully: ${rootEmail}`);
  } catch (error) {
    console.error("Error during root user seeding:", error);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
};

module.exports = seedRootUser;