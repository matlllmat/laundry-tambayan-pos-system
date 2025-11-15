import React, { useState, useEffect } from "react";
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";
import "./AdminEmployees.css";

// 1. Interface updated to include 'salary_daily'
interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  salary: number;
  type: 'admin' | 'employee';
  salary_daily: number; // Added this
}

const API_URL = 'http://localhost/laundry_tambayan_pos_system_backend/';

const AdminEmployees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // 5. Function to fetch employees from DB
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}get_employees.php`);
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
    setFormData({ ...formData, [name]: value });
  };

  const handleAddEmployee = () => {
    setEditing(false);
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

  // handleSubmit (ADD) - No change needed here
  const handleSubmit = async () => {
    const { name, email, phone, salary, password, authPassword, type } = formData;

    if (!name || !email || !phone || !salary || !password || !authPassword || !type) {
      return setModalInfo({ show: true, title: "Error", message: "All fields are required.", type: "error" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return setModalInfo({ show: true, title: "Invalid Email", message: "Please enter a valid email.", type: "error" });
    }
    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      return setModalInfo({ show: true, title: "Invalid Salary", message: "Salary must be a positive number.", type: "error" });
    }

    try {
      const response = await fetch(`${API_URL}manage_employees.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        fetchEmployees(); // Refresh list
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  // Open Edit Modal - No change needed here
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

  // handleUpdate (SAVE) - No change needed here
  const handleUpdate = async () => {
    const { name, email, phone, salary, password, authPassword, type } = formData;

    if (!name || !email || !phone || !salary || !authPassword || !type) {
      return setModalInfo({ show: true, title: "Error", message: "All fields except 'Set Password' are required.", type: "error" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
       return setModalInfo({ show: true, title: "Invalid Email", message: "Please enter a valid email.", type: "error" });
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
        fetchEmployees(); // Refresh list
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
       setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  // handleRemove (DELETE) - No change needed here
  const handleRemove = async () => {
    if (!formData.authPassword) {
      return setModalInfo({ show: true, title: "Error", message: "Authentication password is required to delete.", type: "error" });
    }
    if (!selectedEmployee) return;

    const isConfirmed = window.confirm(`Are you sure you want to remove ${selectedEmployee.name}? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}manage_employees.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        fetchEmployees(); // Refresh list
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  // Filter employees - No change needed here
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
                {/* 2. Table headers are unchanged as requested */}
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
                    {/* 3. Table data is unchanged as requested */}
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

      {/* Add / Edit Modal (No change needed) */}
      {showAddModal && (
        <div className="add-modal-overlay">
          <div className="add-modal">
            <h2>{editing ? "Edit Employee" : "Add Employee"}</h2>
            <div className="form-grid">
              <div>
                <label>Employee Name:</label>
                <input name="name" value={formData.name} onChange={handleChange} />
                <label>Email:</label>
                <input name="email" value={formData.email} onChange={handleChange} />
                <label>Phone number:</label>
                <input name="phone" value={formData.phone} onChange={handleChange} />
                
                <label>Employee Type:</label>
                <select name="type" value={formData.type} onChange={handleChange}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label>Salary:</label>
                <input
                  type="number"
                  step="0.01"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  min="0"
                  autoComplete="off"
                />
                
                <label>{editing ? "Set New Password (optional):" : "Employee Password:"}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder={editing ? "Leave blank to keep old password" : ""}
                />
                <label>Authentication Password:</label>
                <input
                  type="password"
                  name="authPassword"
                  value={formData.authPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-buttons">
              {editing ? (
                <>
                  <button onClick={handleUpdate}>Save Changes</button>
                  <button onClick={handleRemove} className="remove-btn">Remove</button>
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

      {/* Alert Modal (No change needed) */}
      <CustomModal
        show={modalInfo.show}
        title={modalInfo.title}
        message={modalInfo.message}
        onClose={() => setModalInfo({ ...modalInfo, show: false })}
        type={modalInfo.type}
      />
    </div>
  );
};

export default AdminEmployees;