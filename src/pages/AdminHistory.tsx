import React, { useState } from "react";
import "./AdminHistory.css";
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";

// Define service item interface
interface ServiceItem {
    name: string;
    qty: number;
    price: number;
    subtotal: number;
}

// Define transaction interface
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

// Dummy data
const dummyTransactions: Transaction[] = [
    {
        id: "1",
        orderNumber: "ORD-001",
        customerName: "Juan Dela Cruz",
        loadWeight: "5",
        numLoads: "2",
        transactionDate: "2025-10-25",
        scheduleType: "pickup",
        scheduleDate: "2025-10-26",
        serviceItems: [
            { name: "Wash", qty: 2, price: 50, subtotal: 100 },
            { name: "Dry", qty: 1, price: 40, subtotal: 40 },
            { name: "Detergent", qty: 2, price: 15, subtotal: 30 }
        ],
        total: 170
    },
    {
        id: "2",
        orderNumber: "ORD-002",
        customerName: "Maria Santos",
        loadWeight: "8",
        numLoads: "3",
        transactionDate: "2025-10-26",
        scheduleType: "delivery",
        scheduleDate: "2025-10-28",
        serviceItems: [
            { name: "Wash", qty: 3, price: 50, subtotal: 150 },
            { name: "Fold", qty: 2, price: 30, subtotal: 60 },
            { name: "Fabcon", qty: 1, price: 20, subtotal: 20 }
        ],
        total: 230
    },
    {
        id: "3",
        orderNumber: "ORD-003",
        customerName: "Pedro Reyes",
        loadWeight: "3",
        numLoads: "1",
        transactionDate: "2025-10-27",
        scheduleType: "pickup",
        scheduleDate: "2025-10-27",
        serviceItems: [
            { name: "Wash", qty: 1, price: 50, subtotal: 50 },
            { name: "Dry", qty: 1, price: 40, subtotal: 40 },
            { name: "Detergent", qty: 1, price: 15, subtotal: 15 }
        ],
        total: 105
    },
    {
        id: "4",
        orderNumber: "ORD-004",
        customerName: "Ana Garcia",
        loadWeight: "10",
        numLoads: "4",
        transactionDate: "2025-10-27",
        scheduleType: "delivery",
        scheduleDate: "2025-10-29",
        serviceItems: [
            { name: "Wash", qty: 4, price: 50, subtotal: 200 },
            { name: "Dry", qty: 3, price: 40, subtotal: 120 },
            { name: "Fold", qty: 4, price: 30, subtotal: 120 },
            { name: "Detergent", qty: 2, price: 15, subtotal: 30 },
            { name: "Fabcon", qty: 2, price: 20, subtotal: 40 }
        ],
        total: 510
    },
    {
        id: "5",
        orderNumber: "ORD-005",
        customerName: "Carlos Mendoza",
        loadWeight: "6",
        numLoads: "2",
        transactionDate: "2025-10-28",
        scheduleType: "pickup",
        scheduleDate: "2025-10-30",
        serviceItems: [
            { name: "Wash", qty: 2, price: 50, subtotal: 100 },
            { name: "Dry", qty: 2, price: 40, subtotal: 80 },
            { name: "Detergent", qty: 1, price: 15, subtotal: 15 }
        ],
        total: 195
    }
];

const AdminHistory: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>(dummyTransactions);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Transaction | null;
        direction: "asc" | "desc";
    }>({ key: null, direction: "asc" });
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    // Delete modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    // Alert modal states
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: "",
        message: "",
        type: "info" as "info" | "error" | "success"
    });

    // Filter transactions based on search and date range
    const filteredTransactions = transactions.filter((transaction) => {
        const matchesSearch =
            transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDateRange = (() => {
            if (!startDate && !endDate) return true;
            const transDate = new Date(transaction.transactionDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start && end) {
                return transDate >= start && transDate <= end;
            } else if (start) {
                return transDate >= start;
            } else if (end) {
                return transDate <= end;
            }
            return true;
        })();

        return matchesSearch && matchesDateRange;
    });

    // Sort transactions
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "total") {
            aValue = Number(aValue);
            bValue = Number(bValue);
        }

        if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
    });

    // Handle column sort
    const handleSort = (key: keyof Transaction) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Get sort indicator
    const getSortIndicator = (columnName: keyof Transaction) => {
        if (sortConfig.key === columnName) {
            return sortConfig.direction === "asc" ? "▲" : "▼";
        }
        return "";
    };

    // Handle row click to show receipt
    const handleRowClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setShowReceipt(true);
    };

    // Handle delete button click
    const handleDeleteClick = (e: React.MouseEvent, transactionId: string) => {
        e.stopPropagation(); // Prevent row click
        setTransactionToDelete(transactionId);
        setShowDeleteModal(true);
        setDeletePassword("");
    };

    // Handle delete confirmation
    const handleDeleteConfirm = () => {
        if (deletePassword !== "admin123") {
            setShowDeleteModal(false);
            setModalConfig({
                title: "Authentication Failed",
                message: "Invalid authorization password. Transaction not deleted.",
                type: "error"
            });
            setShowModal(true);
            setDeletePassword("");
            return;
        }

        if (transactionToDelete) {
            setTransactions(transactions.filter(t => t.id !== transactionToDelete));
            setShowDeleteModal(false);
            setModalConfig({
                title: "Success",
                message: "Transaction deleted successfully.",
                type: "success"
            });
            setShowModal(true);
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
                    <h3 className="history-subtitle">All Transaction History</h3>
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
                                placeholder="Start Date"
                            />
                            <span className="date-separator">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="filter-input date-input"
                                placeholder="End Date"
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
                            {sortedTransactions.map((transaction) => (
                                <tr
                                    key={transaction.id}
                                    className="clickable-row"
                                    onClick={() => handleRowClick(transaction)}
                                >
                                    <td>{transaction.orderNumber}</td>
                                    <td>{transaction.customerName}</td>
                                    <td>{transaction.transactionDate}</td>
                                    <td>₱{transaction.total}</td>
                                    <td>
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDeleteClick(e, transaction.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
                                                <td>₱{item.price}</td>
                                                <td>₱{item.subtotal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="receipt-total">
                                <span className="total-label">TOTAL AMOUNT:</span>
                                <span className="total-value">₱{selectedTransaction.total}</span>
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