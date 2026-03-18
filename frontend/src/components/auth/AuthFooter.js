
const AuthFooter = ({
  isLoginPage,
  onLoginRedirect,
  onForgotPasswordRedirect,
  isRegisterPage,
  // isForgotPassword,
}) => {
  return (
    <>
      <div className="flex flex-col lg:flex-row items-center justify-between">
        {/* Forgot Password (only on login page) */}
        {isLoginPage && (
          <button
            onClick={onForgotPasswordRedirect} // Navigate to forgot password page
            className="text-sm text-white font-semibold hover:underline mb-2 lg:mb-0"
          >
            Forgot password?
          </button>
        )}

        {/* Don't have an account? and Register Button (only on login page) */}
        {isLoginPage && (
          <div className="flex items-center mt-2 lg:mt-0">
            <p className="text-white font-semibold mr-2">
              Don't have an account?
            </p>
            <button
              type="button"
              onClick={onLoginRedirect}
              className="rounded px-6 py-2 text-xs font-medium  bg-gradient-primaryToRight hover:bg-gradient-primaryToLeft text-white"
            >
              Register
            </button>
          </div>
        )}
      </div>

      {/* Already have an account? and Log In Button (only on register page) */}
      {isRegisterPage && (
        <div className="flex items-center justify-center pb-6">
          <p className="text-white font-semibold mr-10">
            Already have an account?
          </p>
          <button
            onClick={onLoginRedirect}
            className="rounded px-6 py-2 text-xs font-medium bg-gradient-primaryToRight hover:bg-gradient-primaryToLeft text-white"
          >
            Log In
          </button>
        </div>
      )}

      {/* Forgot Password */}
      {/* {isForgotPassword && (
        <div className="flex items-center justify-center pb-6 mt-4">
          <p className="text-white font-semibold mr-10">
            Remember your password?
          </p>
          <button
            onClick={onLoginRedirect}
            className="rounded px-6 py-2 text-xs font-medium bg-gradient-primaryToRight hover:bg-gradient-primaryToLeft text-white"
          >
            Log In
          </button>
        </div>
      )} */}
    </>
  );
};

export default AuthFooter;
