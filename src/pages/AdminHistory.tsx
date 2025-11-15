import React, { useState, useEffect } from "react";
import "./AdminHistory.css";
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";

interface ServiceItem {
    name: string;
    qty: number;
    price: number;
    subtotal: number;
}

interface Transaction {
    id: string;
    orderNumber: string;
    customerName: string;
    loadWeight: string;
    numLoads: string;
    transactionDate: string;
    scheduleType: string;
    scheduleDate: string;
    serviceItems: ServiceItem[];
    total: number;
}

const API_URL = 'http://localhost/laundry_tambayan_pos_system_backend/';

const AdminHistory: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Transaction | null;
        direction: "asc" | "desc";
    }>({ key: null, direction: "asc" });

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: "",
        message: "",
        type: "info" as "info" | "error" | "success"
    });
    const resetFilters = () => {
        setSearchTerm("");
        setStartDate("");
        setEndDate("");
        fetchTransactions();
    };
    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}get_transactions.php`);
            const result = await response.json();
            if (result.success) {
                setTransactions(result.data);
            } else {
                setModalConfig({ title: "Error", message: result.message, type: "error" });
                setShowModal(true);
            }
        } catch (error) {
            setModalConfig({ title: "Network Error", message: "Could not connect to server.", type: "error" });
            setShowModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const filteredTransactions = transactions.filter((transaction) => {
        const matchesSearch =
            transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const transDate = new Date(transaction.transactionDate + "T00:00:00");
        const start = startDate ? new Date(startDate + "T00:00:00") : null;
        const end = endDate ? new Date(endDate + "T23:59:59") : null;

        if (start && end) return transDate >= start && transDate <= end;
        if (start) return transDate >= start;
        if (end) return transDate <= end;

        return matchesSearch;
    });

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        if (sortConfig.key === "total") {
            aValue = Number(aValue);
            bValue = Number(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof Transaction) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (columnName: keyof Transaction) => {
        if (sortConfig.key === columnName) {
            return sortConfig.direction === "asc" ? "▲" : "▼";
        }
        return "";
    };

    const handleRowClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowReceipt(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, transactionId: string) => {
        e.stopPropagation();
        setTransactionToDelete(transactionId);
        setShowDeleteModal(true);
        setDeletePassword("");
    };

    const handleDeleteConfirm = async () => {
        if (!transactionToDelete) return;

        if (deletePassword === "") {
            setModalConfig({
                title: "Password Required",
                message: "Please enter the authentication password.",
                type: "info"
            });
            setShowModal(true);
            return;
        }

        try {
            const response = await fetch(`${API_URL}manage_transactions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    transactionId: transactionToDelete,
                    authPassword: deletePassword
                })
            });

            const result = await response.json();

            if (result.success) {
                setTransactions(transactions.filter(t => t.id !== transactionToDelete));
                setModalConfig({ title: "Success", message: result.message, type: "success" });
                setShowModal(true);
            } else {
                setModalConfig({ title: "Error", message: result.message, type: "error" });
                setShowModal(true);
            }

        } catch (error) {
            setModalConfig({ title: "Network Error", message: "Could not connect to server.", type: "error" });
            setShowModal(true);
        } finally {
            setShowDeleteModal(false);
            setDeletePassword("");
            setTransactionToDelete(null);
        }
    };

    return (
        <div className="history-page">
            <AdminNavbar />
            <SystemTitle />

            <div className="history-container">
                <h2 className="history-title">Transaction History</h2>
                <div className="separator"></div>

                <div className="filter-section">
                    <h3
                        className="history-subtitle"
                        style={{ cursor: "pointer"}}
                        onClick={resetFilters}
                    >
                        All Transaction History
                    </h3>
                    <div className="filter-controls">
                        <input
                            type="text"
                            placeholder="Search by name or order number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="filter-input search-input"
                        />

                        <div className="date-range-container">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="filter-input date-input"
                            />
                            <span className="date-separator">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="filter-input date-input"
                            />
                        </div>
                    </div>
                </div>

                <div className="table-container">
                    <table className="transaction-table">
                        <thead>
                            <tr className="history-header">
                                <th onClick={() => handleSort("orderNumber")}>
                                    Order # <span>{getSortIndicator("orderNumber")}</span>
                                </th>
                                <th onClick={() => handleSort("customerName")}>
                                    Customer Name <span>{getSortIndicator("customerName")}</span>
                                </th>
                                <th onClick={() => handleSort("transactionDate")}>
                                    Date of Transaction <span>{getSortIndicator("transactionDate")}</span>
                                </th>
                                <th onClick={() => handleSort("total")}>
                                    Amount <span>{getSortIndicator("total")}</span>
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} style={{ textAlign: "center" }}>Loading...</td></tr>
                            ) : sortedTransactions.length > 0 ? (
                                sortedTransactions.map((transaction) => (
                                    <tr
                                        key={transaction.id}
                                        className="clickable-row"
                                        onClick={() => handleRowClick(transaction)}
                                    >
                                        <td>{transaction.orderNumber}</td>
                                        <td>{transaction.customerName}</td>
                                        <td>{transaction.transactionDate}</td>
                                        <td>₱{transaction.total.toFixed(2)}</td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => handleDeleteClick(e, transaction.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} style={{ textAlign: "center" }}>No transactions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && selectedTransaction && (
                <div className="receipt-modal-overlay" onClick={() => setShowReceipt(false)}>
                    <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="receipt-header">
                            <h2>Transaction Receipt</h2>
                            <button className="close-btn" onClick={() => setShowReceipt(false)}>✕</button>
                        </div>

                        <div className="receipt-content">
                            <div className="receipt-section">
                                <h3>Order Information</h3>

                                <div className="receipt-row">
                                    <span className="receipt-label">Order Number:</span>
                                    <span className="receipt-value">{selectedTransaction.orderNumber}</span>
                                </div>

                                <div className="receipt-row">
                                    <span className="receipt-label">Customer Name:</span>
                                    <span className="receipt-value">{selectedTransaction.customerName}</span>
                                </div>

                                <div className="receipt-row">
                                    <span className="receipt-label">Transaction Date:</span>
                                    <span className="receipt-value">{selectedTransaction.transactionDate}</span>
                                </div>
                            </div>

                            <div className="receipt-section">
                                <h3>Service Details</h3>

                                <div className="receipt-row">
                                    <span className="receipt-label">Load Weight:</span>
                                    <span className="receipt-value">{selectedTransaction.loadWeight} KG</span>
                                </div>

                                <div className="receipt-row">
                                    <span className="receipt-label">Number of Loads:</span>
                                    <span className="receipt-value">{selectedTransaction.numLoads}</span>
                                </div>

                                <div className="receipt-row">
                                    <span className="receipt-label">Schedule Type:</span>
                                    <span className="receipt-value">{selectedTransaction.scheduleType.toUpperCase()}</span>
                                </div>

                                <div className="receipt-row">
                                    <span className="receipt-label">Schedule Date:</span>
                                    <span className="receipt-value">{selectedTransaction.scheduleDate}</span>
                                </div>
                            </div>

                            <div className="receipt-section">
                                <h3>Service Items</h3>
                                <table className="receipt-items-table">
                                    <thead>
                                        <tr>
                                            <th>Service</th>
                                            <th>Qty</th>
                                            <th>Price</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransaction.serviceItems.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{item.qty}</td>
                                                <td>₱{item.price.toFixed(2)}</td>
                                                <td>₱{item.subtotal.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="receipt-total">
                                <span className="total-label">TOTAL AMOUNT:</span>
                                <span className="total-value">₱{selectedTransaction.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-header">
                            <h3>Delete Transaction</h3>
                        </div>

                        <div className="delete-modal-content">
                            <p>Enter authorization password to delete this transaction:</p>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Enter password"
                                className="delete-password-input"
                                autoFocus
                            />
                        </div>

                        <div className="delete-modal-actions">
                            <button className="confirm-delete-btn" onClick={handleDeleteConfirm}>
                                Confirm Delete
                            </button>

                            <button
                                className="cancel-delete-btn"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletePassword("");
                                    setTransactionToDelete(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            <CustomModal
                show={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
};

export default AdminHistory;
