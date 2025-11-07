import React, { useState } from "react";
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";
import "./AdminEmployees.css";

const AdminEmployees = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        salary: "",
        password: "",
        authPassword: "",
    });

    const [employees, setEmployees] = useState([
        {
            id: 1,
            email: "john.doe@example.com",
            phone: "09171234567",
            name: "John Doe",
            password: "pass123",
            salary: "30000",
        },
        {
            id: 2,
            email: "jane.smith@example.com",
            phone: "09281234567",
            name: "Jane Smith",
            password: "admin321",
            salary: "28000",
        },
    ]);

    const [modalInfo, setModalInfo] = useState({
        show: false,
        title: "",
        message: "",
        type: "info" as "info" | "error" | "success",
    });

    // Input change handler
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Open Add Employee Modal
    const handleAddEmployee = () => {
        setEditing(false);
        setFormData({
            name: "",
            email: "",
            phone: "",
            salary: "",
            password: "",
            authPassword: "",
        });
        setShowAddModal(true);
    };

    // Add Employee
    const handleSubmit = () => {
        const { name, email, phone, salary, password, authPassword } = formData;

        if (!name || !email || !phone || !salary || !password || !authPassword) {
            return setModalInfo({
                show: true,
                title: "Error",
                message: "All fields are required.",
                type: "error",
            });
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            return setModalInfo({
                show: true,
                title: "Invalid Email",
                message: "Please enter a valid email address.",
                type: "error",
            });
        }

        if (!/^\d+$/.test(phone)) {
            return setModalInfo({
                show: true,
                title: "Invalid Phone Number",
                message: "Phone number must contain digits only.",
                type: "error",
            });
        }

        if (isNaN(Number(salary))) {
            return setModalInfo({
                show: true,
                title: "Invalid Salary",
                message: "Salary must be a numeric value.",
                type: "error",
            });
        }

        if (authPassword !== "admin123") {
            return setModalInfo({
                show: true,
                title: "Authentication Failed",
                message: "Incorrect authentication password.",
                type: "error",
            });
        }

        const newEmployee = {
            id: employees.length + 1,
            email,
            phone,
            name,
            password,
            salary,
        };

        setEmployees([...employees, newEmployee]);
        setModalInfo({
            show: true,
            title: "Success",
            message: "Employee successfully added!",
            type: "success",
        });

        setShowAddModal(false);
        setFormData({
            name: "",
            email: "",
            phone: "",
            salary: "",
            password: "",
            authPassword: "",
        });
    };

    // Handle table row click (open edit modal)
    const handleEditClick = (employee: any) => {
        setEditing(true);
        setSelectedEmployee(employee);
        setFormData({
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            salary: employee.salary,
            password: employee.password,
            authPassword: "",
        });
        setShowAddModal(true);
    };

    // Save Changes (Update)
    const handleUpdate = () => {
        const { name, email, phone, salary, password, authPassword } = formData;

        if (!authPassword || authPassword !== "admin123") {
            return setModalInfo({
                show: true,
                title: "Authentication Failed",
                message: "Incorrect authentication password.",
                type: "error",
            });
        }

        const updatedList = employees.map((emp) =>
            emp.id === selectedEmployee.id
                ? { ...emp, name, email, phone, salary, password }
                : emp
        );

        setEmployees(updatedList);
        setModalInfo({
            show: true,
            title: "Success",
            message: "Employee information updated successfully!",
            type: "success",
        });

        setShowAddModal(false);
        setEditing(false);
        setSelectedEmployee(null);
    };

    // Remove Employee
    const handleRemove = () => {
        if (formData.authPassword !== "admin123") {
            return setModalInfo({
                show: true,
                title: "Authentication Failed",
                message: "Incorrect authentication password.",
                type: "error",
            });
        }

        const updatedList = employees.filter(
            (emp) => emp.id !== selectedEmployee.id
        );

        setEmployees(updatedList);
        setModalInfo({
            show: true,
            title: "Removed",
            message: "Employee has been successfully removed.",
            type: "success",
        });

        setShowAddModal(false);
        setEditing(false);
        setSelectedEmployee(null);
    };

    // Filter employees
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
                                <th>Email</th>
                                <th>Phone #</th>
                                <th>Name</th>
                                <th>Password</th>
                                <th>Salary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        onClick={() => handleEditClick(emp)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>{emp.id}</td>
                                        <td>{emp.email}</td>
                                        <td>{emp.phone}</td>
                                        <td>{emp.name}</td>
                                        <td>{emp.password}</td>
                                        <td>{emp.salary}</td>
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
                                <input name="name" value={formData.name} onChange={handleChange} />
                                <label>Email:</label>
                                <input name="email" value={formData.email} onChange={handleChange} />
                                <label>Phone number:</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} />
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
                                <label>Employee Password:</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
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
                                    <button onClick={handleRemove}>Remove</button>
                                    <button
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setEditing(false);
                                            setSelectedEmployee(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={handleSubmit}>Add</button>
                                    <button onClick={() => setShowAddModal(false)}>Cancel</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
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
