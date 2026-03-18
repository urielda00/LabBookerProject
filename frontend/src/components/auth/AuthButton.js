
const AuthButton = ({ isSubmitting, label }) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full bg-gradient-primaryToRight hover:bg-gradient-primaryToLeft text-white py-2 px-4 rounded shadow-md hover:shadow-lg transition"
    >
      {isSubmitting ? "Processing..." : label}
    </button>
  );
};

export default AuthButton;
