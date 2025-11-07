import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomModal from "./Modals";
import "./EmployeeNavbar.css";

const EmployeeNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Check session
  const checkSession = async () => {
    try {
      const response = await fetch(
        "http://localhost/laundry_tambayan_pos_system_backend/helpers/check_session.php",
        { credentials: "include" }
      );
      const data = await response.json();

      if (!data.logged_in || data.user.type !== "employee") {
        navigate("/");
      }
    } catch (error) {
      console.error("Session check failed:", error);
      navigate("/");
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Determine active link
  const getActive = () => {
    if (location.pathname === "/service") return "Service";
    if (location.pathname === "/scheduling") return "Scheduling";
    if (location.pathname === "/history") return "History";
    return "";
  };

  const active = getActive();

  const handleClick = (path: string) => {
    navigate(path);
  };

  // Logout with confirmation modal
  const handleLogoutConfirm = async () => {
    try {
      await fetch("http://localhost/laundry_tambayan_pos_system_backend/logout.php", {
        credentials: "include",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <nav className="employee-navbar d-flex align-items-center px-5 py-3">
        <ul className="nav-links d-flex align-items-center m-0">
          <li>
            <a
              href="#"
              className={`nav-item ${active === "Service" ? "active" : ""}`}
              onClick={() => handleClick("/service")}
            >
              Service
            </a>
          </li>
          <li>
            <a
              href="#"
              className={`nav-item ${active === "History" ? "active" : ""}`}
              onClick={() => handleClick("/history")}
            >
              History
            </a>
          </li>
          <li>
            <a
              href="#"
              className={`nav-item ${active === "Scheduling" ? "active" : ""}`}
              onClick={() => handleClick("/scheduling")}
            >
              Scheduling
            </a>
          </li>
          <li>
            <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <CustomModal
        show={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        type="confirm"
        confirmText="Logout"
        cancelText="Cancel"
      />
    </>
  );
};

export default EmployeeNavbar;
