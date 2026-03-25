const roleMiddleware = {
  checkRole: (allowedRoles) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res
            .status(401)
            .json({ message: "Unauthorized - No user found" });
        }

        // Ensure allowedRoles is an array
        const roles = Array.isArray(allowedRoles)
          ? allowedRoles
          : [allowedRoles];

        const hasRole = roles.includes(req.user.role);
        if (!hasRole) {
          return res.status(403).json({
            message:
              "Forbidden - You don't have the required role to access this resource",
          });
        }

        next();
      } catch (error) {
        if(process.env.NODE_ENV !== 'production') {
          console.error("Role middleware error:", error);
        }else{
          console.error("Role middleware error:", error.message);
        }
        return res.status(500).json({
          message: "Internal server error in role verification",
          error: error.message,
        });
      }
    };
  },
};

module.exports = roleMiddleware;
