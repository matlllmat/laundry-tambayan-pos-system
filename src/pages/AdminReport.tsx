import { useState } from 'react';
import './AdminReport.css';
import AdminNavbar from '../components/AdminNavbar';
import SystemTitle from '../components/SystemTitle';

interface ReportEntry {
    id: number;
    date: string;
    grossIncome: number;
    netIncome: number;
}

const AdminReport = () => {
    const [reportEntries] = useState<ReportEntry[]>([
        { id: 1, date: '2024-01-15', grossIncome: 15000, netIncome: 12000 },
        { id: 2, date: '2024-01-20', grossIncome: 18000, netIncome: 14500 },
        { id: 3, date: '2024-01-25', grossIncome: 20000, netIncome: 16000 },
    ]);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const totalGrossIncome = reportEntries.reduce((sum, entry) => sum + entry.grossIncome, 0);
    const totalNetIncome = reportEntries.reduce((sum, entry) => sum + entry.netIncome, 0);

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

                        <div className="sum-display">
                            <span className="sum-label">Sum</span>
                        </div>
                    </div>

                    <div className="report-table-container">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Gross Income</th>
                                    <th>Net Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{entry.date}</td>
                                        <td>₱{entry.grossIncome.toLocaleString()}</td>
                                        <td>₱{entry.netIncome.toLocaleString()}</td>
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
            </div>
        </div>
    );
};

export default AdminReport;