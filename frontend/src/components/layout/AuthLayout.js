import collegeBuilding from "../../assets/collegeBuilding.jpg";

const AuthLayout = ({ children, headerImage, rightContent }) => {
  return (
    <section
      className="min-h-screen"
      style={{
        backgroundImage: `url(${collegeBuilding})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-full max-w-6xl p-10 bg-black bg-opacity-30 shadow-lg rounded-lg flex flex-col lg:flex-row">
          <div className="w-full lg:w-6/12 p-6">{children}</div>
          <div
            className="w-full lg:w-6/12 flex flex-col items-center justify-center text-white p-6 mt-6 lg:mt-0"
            style={{
              backgroundImage: `url(${headerImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {rightContent}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthLayout;
