import { FaWifi, FaTv, FaCoffee, FaChair, FaChalkboard } from "react-icons/fa";
import { MdChargingStation } from "react-icons/md";
import { BsFillProjectorFill } from "react-icons/bs";
import { FiPrinter } from "react-icons/fi";
import { TbAirConditioning } from "react-icons/tb";
import { CiSpeaker } from "react-icons/ci";

const iconMapping = {
  wifi: <FaWifi className="h-5 w-5" />,
  tv: <FaTv className="h-5 w-5" />,
  projector: <BsFillProjectorFill className="h-5 w-5" />,
  coffee: <FaCoffee className="h-5 w-5" />,
  chargingstation: <MdChargingStation className="h-5 w-5" />,
  chair: <FaChair className="h-5 w-5" />,
  whiteboard: <FaChalkboard className="h-5 w-5" />,
  ac: <TbAirConditioning className="h-5 w-5" />,
  printer: <FiPrinter className="h-5 w-5" />,
  speakers: <CiSpeaker className="h-5 w-5" />,
};

export default iconMapping;
