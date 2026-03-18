import highFive from "../../assets/high-five.png";
import realTimeUpdate from "../../assets/real-time.png";
import reliability from "../../assets/reliability.png";

const FeaturesSection = () => {
  return (
    <div
      className="py-10 border-[10px] px-6"
      style={{
        background:
          "linear-gradient(to right, rgba(1, 84, 206, 0.7), rgba(0, 130, 180, 0.7), rgba(1, 156, 140, 0.7))",
      }}
    >
      <h3 className="text-2xl font-bold text-center mb-6">
        Why You'll Love It
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="relative border-8 p-6 overflow-hidden">
          <img src={highFive} alt="Feature 1" className="mx-auto w-16 h-16" />
          <h4 className="text-lg font-bold mt-4 text-black">User-Friendly</h4>
          <p className="text-sm mt-2 text-black">
            Easy-to-navigate platform for hassle-free bookings.
          </p>
        </div>
        <div className="relative border-8 p-6 overflow-hidden">
          <img
            src={realTimeUpdate}
            alt="Feature 2"
            className="mx-auto w-16 h-16"
          />
          <h4 className="text-lg font-bold mt-4 text-black">
            Real-Time Updates
          </h4>
          <p className="text-sm mt-2 text-black">
            Get real-time availability status.
          </p>
        </div>
        <div className="relative border-8 p-6 overflow-hidden">
          <img
            src={reliability}
            alt="Feature 3"
            className="mx-auto w-16 h-16"
          />
          <h4 className="text-lg font-bold mt-4 text-black">Reliable</h4>
          <p className="text-sm mt-2 text-black">
            Always accurate and up-to-date information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
