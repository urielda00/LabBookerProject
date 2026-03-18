import { Link } from "react-router-dom";
import {
  Instagram,
  Twitter,
  Linkedin,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const currentYear = new Date().getFullYear();

function Footer() {
  const { t } = useTranslation();

  const socialLinks = [
    {
      icon: <Instagram className="w-5 h-5" />,
      href: "https://instagram.com/labbooker",
      name: "Instagram",
    },
    {
      icon: <Twitter className="w-5 h-5" />,
      href: "https://twitter.com/labbooker",
      name: "Twitter",
    },
    {
      icon: <Linkedin className="w-5 h-5" />,
      href: "https://linkedin.com/company/labbooker",
      name: "LinkedIn",
    },
  ];

  const footerLinks = [
    { label: t("footer.navigation.about"), path: "/about" },
    { label: t("footer.navigation.faq"), path: "/faq" },
    { label: t("footer.navigation.contact"), path: "/contact" },
    // { label: "Privacy Policy", path: "/privacypolicy" },
    // { label: "Terms of Service", path: "/termsofservice" },
    { label: t("footer.navigation.reportIssue"), path: "/issuereport" },
  ];

  const contactInfo = [
    {
      icon: <MapPin className="w-5 h-5" />,
      text: "Azrieli College of Engineering, Jerusalem",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      text: "support@labbooker.com",
    },
    {
      icon: <Phone className="w-5 h-5" />,
      text: "+972 (0)2-123-4567",
    },
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-800 text-gray-300 pt-16 pb-8">
      <div className="container mx-auto px-4 xl:px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-blue-500">
              LabBooker
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("footer.brandSubtitle")}
            </p>

            <div className="flex space-x-4 rtl:space-x-reverse">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    p-2 rounded-lg bg-gray-700 hover:bg-gray-600
                    transition-all duration-300
                    transform hover:-translate-y-1
                    group relative
                  "
                  aria-label={social.name}
                >
                  {social.icon}
                  <span
                    className="
                      absolute -top-8 left-1/2 -translate-x-1/2
                      bg-gray-800 text-white px-2 py-1 rounded-md
                      text-xs font-medium
                      opacity-0 group-hover:opacity-100 transition-opacity
                      shadow-lg
                    "
                  >
                    {social.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white uppercase tracking-wide">
              {t("footer.navigation.title")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="
                      flex items-center group
                      text-gray-400 hover:text-white
                      transition-all duration-300
                    "
                  >
                    <span className="w-2 h-px bg-blue-500 opacity-0 group-hover:opacity-100 mr-2 rtl:mr-0 rtl:ml-2 transition-opacity" />
                    {link.label}
                    <span className="ml-auto rtl:ml-0 rtl:mr-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      ↗
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white uppercase tracking-wide">
              {t("footer.navigation.contact")}
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((contact, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 rtl:space-x-reverse text-gray-400"
                >
                  <span className="shrink-0 mt-1 text-blue-500">
                    {contact.icon}
                  </span>
                  <span className="text-sm leading-relaxed">{contact.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          {/* <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white uppercase tracking-wide">
              {t("footer.newsletter.title")}
            </h4>
            <form className="flex flex-col space-y-4">
              <input
                type="email"
                placeholder= {t("footer.newsletter.placeholder")}
                className="
                  w-full px-4 py-3
                  bg-gray-700 border border-gray-600
                  rounded-lg
                  text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  transition-all
                "
              />
              <button
                type="submit"
                className="
                  w-full py-3 px-6
                  bg-blue-500
                  text-white font-medium
                  rounded-lg
                  hover:from-blue-600 hover:to-emerald-600
                  transform hover:scale-[1.02]
                  transition-all
                  flex items-center justify-center
                "
              >
                {t("footer.newsletter.subscribeButton")}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t("footer.newsletter.helpText")}
            </p>
          </div> */}
        </div>

        {/* Copyright Section */}
        <div className="pt-8 mt-12 border-t border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-gray-500 text-center">
              © {currentYear} LabBooker™. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <Link
                to="/termsofservice"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t("footer.links.termsOfService")}
              </Link>
              <span className="text-gray-600">•</span>
              <Link
                to="/privacypolicy"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t("footer.links.privacyPolicy")}
              </Link>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 text-sm">
                {t("footer.developedByAzrieli")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
