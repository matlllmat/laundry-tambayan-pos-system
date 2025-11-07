import { useState } from 'react';
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import './AdminBudget.css';

interface BudgetEntry {
    id: number;
    expense: string;
    cost: number;
    dateRange: string;
}

const AdminBudget = () => {
    const [budgetEntries] = useState<BudgetEntry[]>([
        { id: 1, expense: 'Utilities', cost: 5000, dateRange: '2024-01-01 to 2024-01-31' },
        { id: 2, expense: 'Supplies', cost: 3000, dateRange: '2024-01-01 to 2024-01-31' },
        { id: 3, expense: 'Maintenance', cost: 2000, dateRange: '2024-01-01 to 2024-01-31' },
    ]);

    const [expenseName, setExpenseName] = useState('');
    const [expenseCost, setExpenseCost] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [authPassword, setAuthPassword] = useState('');

    const netTotal = 100000;
    const grossTotal = budgetEntries.reduce((sum, entry) => sum + entry.cost, 0);

    return (
        <div className="admin-budget-page">
            <SystemTitle />
            <AdminNavbar />
            <div className="admin-budget-container">
                <div className="budget-content-wrapper">
                    {/* Left side - Table */}
                    <div className="budget-table-section">
                        <div className="budget-header">
                            <h1>Budget</h1>
                        </div>

                        <div className="table-responsive">
                            <table className="table budget-table">
                                <thead>
                                    <tr>
                                        <th>Expense</th>
                                        <th>Cost</th>
                                        <th>Date Range</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {budgetEntries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td>{entry.expense}</td>
                                            <td>₱{entry.cost.toLocaleString()}</td>
                                            <td>{entry.dateRange}</td>
                                        </tr>
                                    ))}
                                    {/* Empty rows for visual effect */}
                                    {[...Array(10)].map((_, i) => (
                                        <tr key={`empty-${i}`} className="empty-row">
                                            <td>&nbsp;</td>
                                            <td>&nbsp;</td>
                                            <td>&nbsp;</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right side - Form */}
                    <div className="budget-sidebar">
                        <div className="budget-totals">
                            <div className="total-item">
                                <label>Net total:</label>
                                <input
                                    type="text"
                                    value={`₱ ${netTotal.toLocaleString()}`}
                                    readOnly
                                    className="total-input"
                                />
                            </div>
                            <div className="total-item">
                                <label>Gross total:</label>
                                <input
                                    type="text"
                                    value={grossTotal > 0 ? `₱ ${grossTotal.toLocaleString()}` : ''}
                                    readOnly
                                    className="total-input"
                                />
                            </div>
                        </div>

                        <div className="budget-form">
                            <div className="form-group">
                                <label>Expense name:</label>
                                <input
                                    type="text"
                                    value={expenseName}
                                    onChange={(e) => setExpenseName(e.target.value)}
                                    className="form-control budget-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Expense cost:</label>
                                <input
                                    type="text"
                                    value={expenseCost}
                                    onChange={(e) => setExpenseCost(e.target.value)}
                                    className="form-control budget-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Choose Date Range:</label>
                                <div className="date-input-wrapper">
                                    <span className="date-label">From:</span>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="form-control budget-input date-input"
                                    />
                                </div>
                                <div className="date-input-wrapper">
                                    <span className="date-label">To:</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="form-control budget-input date-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Authentication Password:</label>
                                <input
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    className="form-control budget-input"
                                />
                            </div>

                            <div className="button-group">
                                <button className="action-btn add-btn">
                                    Add
                                </button>
                                <button className="action-btn cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBudget;