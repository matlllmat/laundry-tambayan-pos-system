import { useState, useEffect } from 'react';
import './AdminReport.css';
import AdminNavbar from '../components/AdminNavbar';
import SystemTitle from '../components/SystemTitle';
import SettingsFooter from '../components/SettingsFooter';

interface ReportEntry {
    snapshot_id: number;
    report_name: string;
    date_from: string;
    date_to: string;
    gross_income: number;
    total_expenses: number;
    net_income: number;
    total_orders: number;
    created_at: string;
    created_by_name: string;
}

interface CalculatedReport {
    gross_income: number;
    total_expenses: number;
    net_income: number;
    total_orders: number;
    date_from: string;
    date_to: string;
    total_budget_entries: number;
    expense_details: ExpenseDetail[];
}

interface ExpenseDetail {
    budget_id: number;
    expense_name: string;
    budget_allocated: number;
    daily_cost: number;
    budget_date_start: string;
    budget_date_end: string;
    overlap_days: number;
    proportional_expense: number;
}

const AdminReport = () => {
    const API_BASE_URL = 'http://localhost/laundry_tambayan_pos_system_backend';

    const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Calculation preview
    const [calculatedReport, setCalculatedReport] = useState<CalculatedReport | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Modals
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<ReportEntry | null>(null);
    const [snapshotToDelete, setSnapshotToDelete] = useState<ReportEntry | null>(null);
    const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([]);

    // Save form
    const [reportName, setReportName] = useState('');
    const [notes, setNotes] = useState('');
    const [password, setPassword] = useState('');
    const [saveError, setSaveError] = useState('');

    // Delete form
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const fetchSavedSnapshots = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/get_snapshots.php`, {
                credentials: 'include'
            });
            const data = await response.json();

            console.log('Fetch response:', data); //for debugging

            // Change this line to look for 'data' instead of 'snapshots'
            if (data.success && Array.isArray(data.data)) {
                setReportEntries(data.data);  // Changed from data.snapshots to data.data
            } else {
                console.error('Failed to fetch snapshots:', data.message);
                setReportEntries([]); //Ensure it's always an array
            }
        } catch (error) {
            console.error('Error fetching snapshots:', error);
            setReportEntries([]);
        }
    };

    const handleCalculate = async () => {
        if (!dateFrom || !dateTo) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
            alert('Start date must be before end date');
            return;
        }

        setIsCalculating(true);

        try {
            const url = `${API_BASE_URL}/calculate_report.php?from=${dateFrom}&to=${dateTo}`;
            console.log('Fetching URL:', url); // Debug log

            const response = await fetch(url, { credentials: 'include' });

            console.log('Response status:', response.status); // Debug log

            const data = await response.json();
            console.log('Calculate report response:', data); // Debug log

            if (data.success) {
                setCalculatedReport(data.data);  // ← Fixed!

                // Generate default report name
                const autoName = `Report ${dateFrom} to ${dateTo}`;
                setReportName(autoName);
                setNotes('');
                setPassword('');
                setSaveError('');

                // Open save modal
                setShowSaveModal(true);
            } else {
                console.error('Calculation failed:', data);
                alert(data.message || 'Failed to calculate report');
            }
        } catch (error) {
            console.error('Error calculating report:', error);
            alert('Failed to calculate report');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSaveSnapshot = async () => {
        if (!reportName.trim()) {
            setSaveError('Report name is required');
            return;
        }

        if (!password) {
            setSaveError('Password is required');
            return;
        }

        if (!calculatedReport) {
            setSaveError('No calculated report data');
            return;
        }

        try {
            // First verify password
            const verifyResponse = await fetch(`${API_BASE_URL}/verify_employee_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyData.success) {
                setSaveError(verifyData.message || 'Incorrect password');
                return;
            }

            // Password verified, now save snapshot
            const saveResponse = await fetch(`${API_BASE_URL}/save_snapshot.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    report_name: reportName,
                    date_from: calculatedReport.date_from,
                    date_to: calculatedReport.date_to,
                    gross_income: calculatedReport.gross_income,
                    total_expenses: calculatedReport.total_expenses,
                    net_income: calculatedReport.net_income,
                    total_orders: calculatedReport.total_orders,
                    total_budget_entries: calculatedReport.total_budget_entries,
                    expense_details: calculatedReport.expense_details,
                    notes: notes,
                    password: password
                })
            });

            const saveData = await saveResponse.json();

            if (saveData.success) {
                alert('Snapshot saved successfully!');
                setShowSaveModal(false);
                setCalculatedReport(null);
                setReportName('');
                setNotes('');
                setPassword('');
                setSaveError('');

                // Refresh the list
                fetchSavedSnapshots();
            } else {
                setSaveError(saveData.message || 'Failed to save snapshot');
            }
        } catch (error) {
            console.error('Error saving snapshot:', error);
            setSaveError('Failed to save snapshot');
        }
    };

    const handleViewDetails = async (snapshot: ReportEntry) => {
        setSelectedSnapshot(snapshot);
        setExpenseDetails([]); // Initialize as empty array first

        try {
            const response = await fetch(
                `${API_BASE_URL}/get_snapshot_details.php?id=${snapshot.snapshot_id}`,
                { credentials: 'include' }
            );

            const data = await response.json();

            console.log('Snapshot details response:', data); // Debug log

            if (data.success) {
                // Change from data.details to data.data.expense_details
                setExpenseDetails(Array.isArray(data.data?.expense_details) ? data.data.expense_details : []);
                setShowDetailModal(true);
            } else {
                alert(data.message || 'Failed to fetch details');
                setExpenseDetails([]); // Set to empty array on error
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            alert('Failed to fetch snapshot details');
            setExpenseDetails([]); // Set to empty array on error
        }
    };

    const handleDeleteSnapshot = async () => {
        if (!deletePassword) {
            setDeleteError('Password is required');
            return;
        }

        if (!snapshotToDelete) {
            setDeleteError('No snapshot selected');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/delete_snapshot.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    snapshot_id: snapshotToDelete.snapshot_id,
                    password: deletePassword
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Snapshot deleted successfully!');
                setShowDeleteModal(false);
                setSnapshotToDelete(null);
                setDeletePassword('');
                setDeleteError('');

                // Refresh the list
                fetchSavedSnapshots();
            } else {
                setDeleteError(data.message || 'Failed to delete snapshot');
            }
        } catch (error) {
            console.error('Error deleting snapshot:', error);
            setDeleteError('Failed to delete snapshot');
        }
    };

    useEffect(() => {
        fetchSavedSnapshots();
    }, []);

    return (
        <div className="admin-report-page">
            <AdminNavbar />
            <SystemTitle />

            <div className="admin-report-container">
                <div className="report-wrapper">
                    <div className="report-header">
                        <h1>Income Report</h1>
                    </div>

                    <div className="report-controls">
                        <div className="date-range-section">
                            <div className="calendar-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <span className="date-label">Choose Date Range:</span>
                            <div className="date-inputs">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="date-input"
                                    placeholder="DD-MM-YYY"
                                />
                                <span className="date-separator">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="date-input"
                                    placeholder="DD-MM-YYY"
                                />
                            </div>
                        </div>

                        <button
                            className="sum-button"
                            onClick={handleCalculate}
                            disabled={isCalculating || !dateFrom || !dateTo}
                        >
                            {isCalculating ? 'Calculating...' : 'Sum'}
                        </button>
                    </div>

                    <div className="report-table-container">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Report Name</th>
                                    <th>Date Range</th>
                                    <th>Gross Income</th>
                                    <th>Total Expenses</th>
                                    <th>Net Income</th>
                                    <th>Orders</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportEntries.length === 0 ? (
                                    <tr className="empty-row">
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                            No saved snapshots yet. Create one by selecting a date range and clicking Sum.
                                        </td>
                                    </tr>
                                ) : (
                                    reportEntries.map((entry) => (
                                        <tr
                                            key={entry.snapshot_id}
                                            onClick={() => handleViewDetails(entry)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>{entry.report_name}</td>
                                            <td>{entry.date_from} to {entry.date_to}</td>
                                            <td>₱{entry.gross_income.toLocaleString()}</td>
                                            <td>₱{entry.total_expenses.toLocaleString()}</td>
                                            <td>₱{entry.net_income.toLocaleString()}</td>
                                            <td>{entry.total_orders}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            < SettingsFooter />

            {/* Save Snapshot Modal */}
            {showSaveModal && calculatedReport && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Save Income Report Snapshot</h2>
                            <button className="modal-close" onClick={() => setShowSaveModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="calculation-preview">
                                <h3>Report Summary</h3>
                                <div className="preview-grid">
                                    <div className="preview-item">
                                        <span className="preview-label">Date Range:</span>
                                        <span className="preview-value">{calculatedReport.date_from} to {calculatedReport.date_to}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">Gross Income:</span>
                                        <span className="preview-value">₱{calculatedReport.gross_income.toLocaleString()}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">Total Expenses:</span>
                                        <span className="preview-value">₱{calculatedReport.total_expenses.toLocaleString()}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">Net Income:</span>
                                        <span className="preview-value net-income">₱{calculatedReport.net_income.toLocaleString()}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="preview-label">Total Orders:</span>
                                        <span className="preview-value">{calculatedReport.total_orders}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Report Name *</label>
                                <input
                                    type="text"
                                    value={reportName}
                                    onChange={(e) => setReportName(e.target.value)}
                                    placeholder="Enter report name"
                                    className="modal-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes about this report"
                                    className="modal-textarea"
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label>Your Password *</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password to confirm"
                                    className="modal-input"
                                />
                            </div>

                            {saveError && <div className="error-message">{saveError}</div>}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-save" onClick={handleSaveSnapshot}>
                                Save Snapshot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {showDetailModal && selectedSnapshot && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedSnapshot.report_name}</h2>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-summary">
                                <div className="detail-row">
                                    <span className="detail-label">Date Range:</span>
                                    <span className="detail-value">{selectedSnapshot.date_from} to {selectedSnapshot.date_to}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Gross Income:</span>
                                    <span className="detail-value">₱{selectedSnapshot.gross_income.toLocaleString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Total Expenses:</span>
                                    <span className="detail-value">₱{selectedSnapshot.total_expenses.toLocaleString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Net Income:</span>
                                    <span className="detail-value net-income">₱{selectedSnapshot.net_income.toLocaleString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Total Orders:</span>
                                    <span className="detail-value">{selectedSnapshot.total_orders}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Created By:</span>
                                    <span className="detail-value">{selectedSnapshot.created_by_name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Created At:</span>
                                    <span className="detail-value">{new Date(selectedSnapshot.created_at).toLocaleString()}</span>
                                </div>
                            </div>

                            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Expense Breakdown</h3>

                            {expenseDetails.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666' }}>No expense details available</p>
                            ) : (
                                <div className="expense-table-container">
                                    <table className="expense-detail-table">
                                        <thead>
                                            <tr>
                                                <th>Expense Name</th>
                                                <th>Budget Allocated</th>
                                                <th>Daily Cost</th>
                                                <th>Budget Period</th>
                                                <th>Overlap Days</th>
                                                <th>Proportional Expense</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenseDetails.map((detail, index) => (
                                                <tr key={index}>
                                                    <td>{detail.expense_name}</td>
                                                    <td>₱{detail.budget_allocated.toLocaleString()}</td>
                                                    <td>₱{detail.daily_cost.toLocaleString()}</td>
                                                    <td>{detail.budget_date_start} to {detail.budget_date_end}</td>
                                                    <td>{detail.overlap_days} days</td>
                                                    <td>₱{detail.proportional_expense.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                                <td style={{ fontWeight: 'bold' }}>
                                                    ₱{expenseDetails.reduce((sum, d) => sum + d.proportional_expense, 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-delete"
                                onClick={() => {
                                    setSnapshotToDelete(selectedSnapshot);
                                    setDeletePassword('');
                                    setDeleteError('');
                                    setShowDetailModal(false);
                                    setShowDeleteModal(true);
                                }}
                            >
                                Delete Report
                            </button>
                            <button className="btn-cancel" onClick={() => setShowDetailModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && snapshotToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Snapshot</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem' }}>
                                Are you sure you want to delete this snapshot?
                            </p>
                            <div className="delete-info">
                                <strong>{snapshotToDelete.report_name}</strong>
                                <br />
                                <span style={{ fontSize: '0.9rem', color: '#666' }}>
                                    {snapshotToDelete.date_from} to {snapshotToDelete.date_to}
                                </span>
                            </div>

                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label>Enter Your Password to Confirm *</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="modal-input"
                                />
                            </div>

                            {deleteError && <div className="error-message">{deleteError}</div>}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-delete" onClick={handleDeleteSnapshot}>
                                Delete Snapshot
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReport;