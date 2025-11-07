import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomModal from "./Modals";
import "./AdminNavbar.css";

const AdminNavbar: React.FC = () => {
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

      if (!data.logged_in || data.user.type !== "admin") {
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
    if (location.pathname === "/adminhistory") return "AdminHistory";
    if (location.pathname === "/adminreport") return "AdminReport";
    if (location.pathname === "/adminemployees") return "AdminEmployees";
    if (location.pathname === "/adminbudget") return "AdminBudget";
    if (location.pathname === "/adminitems") return "AdminItems";
    return "";
  };

  const active = getActive();

  const handleClick = (path: string) => {
    navigate(path);
  };

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
              className={`nav-item ${active === "AdminHistory" ? "active" : ""}`}
              onClick={() => handleClick("/adminhistory")}
            >
              History
            </a>
          </li>
          <li>
            <a
              href="#"
              className={`nav-item ${active === "AdminReport" ? "active" : ""}`}
              onClick={() => handleClick("/adminreport")}
            >
              Report
            </a>
          </li>
          <li>
            <a
              href="#"
              className={`nav-item ${active === "AdminEmployees" ? "active" : ""}`}
              onClick={() => handleClick("/adminemployees")}
            >
              Employees
            </a>
          </li>
          <li>
            <a
              href="#"
              className={`nav-item ${active === "AdminBudget" ? "active" : ""}`}
              onClick={() => handleClick("/adminbudget")}
            >
              Budget
            </a>
          </li>
          <li>
            <a
              href="#"
              className={`nav-item ${active === "AdminItems" ? "active" : ""}`}
              onClick={() => handleClick("/adminitems")}
            >
              Items
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

export default AdminNavbar;
