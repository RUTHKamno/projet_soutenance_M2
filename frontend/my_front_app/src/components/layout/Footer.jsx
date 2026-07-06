import "../../styles/Footer.css";
import logo from "../../assets/logo/logo_png.png";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footerInner">
        <div className="footerLogo">
          <img src={logo} alt="Be IT Africa logo" className="footerLogoImage" />

          <span
            style={{
              marginLeft: 8,
              fontWeight: 700,
              color: "#000",
            }}
          >
            Be IT Africa
          </span>
        </div>

        <p className="footerText">
          © 2026 Be I.T Africa — Tous droits réservés
        </p>
      </div>
    </footer>
  );
};

export default Footer;
