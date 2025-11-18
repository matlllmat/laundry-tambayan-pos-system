import React, { useState, useEffect } from "react";
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";
import "./AdminEmployees.css";
import SettingsFooter from "../components/SettingsFooter";

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  salary: number;
  type: 'admin' | 'employee';
  salary_daily: number;
}

const API_URL = 'http://localhost/laundry_tambayan_pos_system_backend/';

const AdminEmployees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    salary: "",
    password: "",
    authPassword: "",
    type: "employee",
  });

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [modalInfo, setModalInfo] = useState({
    show: false,
    title: "",
    message: "",
    type: "info" as "info" | "error" | "success",
  });

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>).";
    }
    return null;
  };

  // NEW: Check if this is the last admin
  const isLastAdmin = (): boolean => {
    const adminCount = employees.filter(emp => emp.type === 'admin').length;
    return adminCount === 1 && selectedEmployee?.type === 'admin';
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}get_employees.php`, {
        credentials: "include"
      });
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
      } else {
        setModalInfo({
          show: true,
          title: "Error",
          message: result.message || "Failed to fetch employees.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setModalInfo({
        show: true,
        title: "Network Error",
        message: "Could not connect to the server.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length > 11) return;
      setFormData({ ...formData, [name]: digitsOnly });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleAddEmployee = () => {
    setEditing(false);
    setShowPassword(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      salary: "",
      password: "",
      authPassword: "",
      type: "employee",
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const { name, email, phone, salary, password, authPassword, type } = formData;

    if (!name || !email || !phone || !salary || !password || !authPassword || !type) {
      return setModalInfo({ show: true, title: "Error", message: "All fields are required.", type: "error" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return setModalInfo({ show: true, title: "Invalid Email", message: "Please enter a valid email.", type: "error" });
    }

    if (!/^09\d{9}$/.test(phone)) {
      return setModalInfo({ show: true, title: "Invalid Phone", message: "Phone number must be exactly 11 digits starting with 09.", type: "error" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return setModalInfo({ show: true, title: "Invalid Password", message: passwordError, type: "error" });
    }

    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      return setModalInfo({ show: true, title: "Invalid Salary", message: "Salary must be a positive number.", type: "error" });
    }

    try {
      const response = await fetch(`${API_URL}manage_employees.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({
          action: 'add',
          name,
          email,
          phone,
          salary: salaryNum,
          password,
          type,
          authPassword
        })
      });
      const result = await response.json();
      if (result.success) {
        setModalInfo({ show: true, title: "Success", message: result.message, type: "success" });
        setShowAddModal(false);
        fetchEmployees();
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  const handleEditClick = (employee: Employee) => {
    setEditing(true);
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      salary: employee.salary.toString(),
      type: employee.type,
      password: "",
      authPassword: "",
    });
    setShowAddModal(true);
  };

  const handleUpdate = async () => {
    const { name, email, phone, salary, password, authPassword, type } = formData;

    if (!name || !email || !phone || !salary || !authPassword || !type) {
      return setModalInfo({ show: true, title: "Error", message: "All fields except 'Set Password' are required.", type: "error" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return setModalInfo({ show: true, title: "Invalid Email", message: "Please enter a valid email.", type: "error" });
    }

    if (!/^09\d{9}$/.test(phone)) {
      return setModalInfo({ show: true, title: "Invalid Phone", message: "Phone number must be exactly 11 digits starting with 09.", type: "error" });
    }

    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return setModalInfo({ show: true, title: "Invalid Password", message: passwordError, type: "error" });
      }
    }

    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      return setModalInfo({ show: true, title: "Invalid Salary", message: "Salary must be a positive number.", type: "error" });
    }
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`${API_URL}manage_employees.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({
          action: 'update',
          employeeId: selectedEmployee.id,
          name,
          email,
          phone,
          salary: salaryNum,
          password,
          type,
          authPassword
        })
      });
      const result = await response.json();
      if (result.success) {
        setModalInfo({ show: true, title: "Success", message: result.message, type: "success" });
        setShowAddModal(false);
        setEditing(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  // UPDATED: Check if last admin before deleting
  const handleRemove = async () => {
    if (!formData.authPassword) {
      return setModalInfo({ show: true, title: "Error", message: "Authentication password is required to delete.", type: "error" });
    }
    if (!selectedEmployee) return;

    // NEW: Prevent deletion of last admin
    if (isLastAdmin()) {
      return setModalInfo({
        show: true,
        title: "Cannot Delete",
        message: "Cannot delete the last admin account. The system must have at least one admin.",
        type: "error"
      });
    }

    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);

    if (!selectedEmployee) return;

    try {
      const response = await fetch(`${API_URL}manage_employees.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({
          action: 'delete',
          employeeId: selectedEmployee.id,
          authPassword: formData.authPassword
        })
      });
      const result = await response.json();
      if (result.success) {
        setModalInfo({ show: true, title: "Success", message: result.message, type: "success" });
        setShowAddModal(false);
        setEditing(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-employees-page">
      <SystemTitle />
      <AdminNavbar />

      <div className="employee-container">
        <div className="employee-header">
          <h1>Employee List</h1>
          <div>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="employee-table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee #</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone #</th>
                <th>Salary</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: "center" }}>Loading...</td></tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleEditClick(emp)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{emp.id}</td>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.phone}</td>
                    <td>₱{emp.salary.toFixed(2)}</td>
                    <td>{emp.type.charAt(0).toUpperCase() + emp.type.slice(1)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="employee-footer">
          <button className="add-employee-btn" onClick={handleAddEmployee}>
            Add New Employee
          </button>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="add-modal-overlay">
          <div className="add-modal">
            <h2>{editing ? "Edit Employee" : "Add Employee"}</h2>
            <div className="form-grid">
              <div>
                <label>Employee Name:</label>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Enter name" />
                <label>Email:</label>
                <input name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" />
                <label>Phone number:</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                />
                <label>Salary (₱):</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="Enter salary"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label>Employee Type:</label>
                <select name="type" value={formData.type} onChange={handleChange}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <label>{editing ? "Set New Password (optional):" : "Employee Password:"}</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={!editing && showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder={editing ? "Leave blank to keep old password" : "Enter password"}
                    style={{ paddingRight: !editing ? "40px" : undefined }}
                  />
                  {!editing && (
                    <i
                      className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#666",
                      }}
                    ></i>
                  )}
                </div>

                <label>Authentication Password:</label>
                <input
                  type="password"
                  name="authPassword"
                  value={formData.authPassword}
                  onChange={handleChange}
                  placeholder="Enter admin password"
                />
              </div>
            </div>

            <div className="modal-buttons">
              {editing ? (
                <>
                  <button onClick={handleUpdate}>Save Changes</button>
                  <button
                    onClick={handleRemove}
                    className="remove-btn"
                    disabled={isLastAdmin()}
                    style={{
                      opacity: isLastAdmin() ? 0.5 : 1,
                      cursor: isLastAdmin() ? 'not-allowed' : 'pointer'
                    }}
                    title={isLastAdmin() ? "Cannot delete the last admin" : "Delete employee"}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditing(false);
                      setSelectedEmployee(null);
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleSubmit}>Add</button>
                  <button onClick={() => setShowAddModal(false)} className="cancel-btn">Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <SettingsFooter />

      <CustomModal
        show={modalInfo.show}
        title={modalInfo.title}
        message={modalInfo.message}
        onClose={() => setModalInfo({ ...modalInfo, show: false })}
        type={modalInfo.type}
      />

      <CustomModal
        show={showDeleteConfirm}
        title="Confirm Deletion"
        message={`Are you sure you want to remove ${selectedEmployee?.name}? This action cannot be undone.`}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        type="confirm"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default AdminEmployees;