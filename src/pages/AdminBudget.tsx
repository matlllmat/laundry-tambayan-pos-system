import { useState, useEffect } from 'react';
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";
import './AdminBudget.css';
import SettingsFooter from '../components/SettingsFooter';

interface BudgetEntry {
  budget_id: number;
  expense_name: string;
  budget_allocated: number;
  date_start: string;
  date_end: string;
  daily: number;
}

interface BudgetTotals {
  gross_total: number;
  total_expenses: number;
  net_total: number;
}

const API_URL = 'http://localhost/laundry_tambayan_pos_system_backend/';

const AdminBudget = () => {
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totals, setTotals] = useState<BudgetTotals>({
    net_total: 0,
    gross_total: 0,
    total_expenses: 0
  });

  // Form state
  const [expenseName, setExpenseName] = useState('');
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Editing state
  const [editing, setEditing] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);


  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'expense_name' | 'budget_allocated' | 'daily' | 'date_start' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get current month's first and last day
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      from: formatDate(firstDay),
      to: formatDate(lastDay)
    };
  };

  // Modal state
  const [modalInfo, setModalInfo] = useState({
    show: false,
    title: "",
    message: "",
    type: "info" as "info" | "error" | "success",
  });

  // Fetch function
  const fetchBudget = async () => {
    setIsLoading(true);
    try {
      const url = `${API_URL}get_budget.php?dateFrom=${filterDateFrom}&dateTo=${filterDateTo}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setBudgetEntries(result.data);
        setTotals(result.totals);
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Get date range based on shortcut
  const getDateRangeShortcut = (type: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let from: Date;
    let to: Date = now;

    switch (type) {
      case 'today':
        from = now;
        to = now;
        break;
      case 'week':
        // Get start of current week (Sunday)
        from = new Date(now);
        from.setDate(now.getDate() - now.getDay());
        break;
      case 'month':
        // Get start of current month
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        // Get start of current year
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
    }

    return {
      from: formatDate(from),
      to: formatDate(to)
    };
  };

  // Handle shortcut button click
  const handleDateShortcut = (type: 'today' | 'week' | 'month' | 'year') => {
    const range = getDateRangeShortcut(type);
    setFilterDateFrom(range.from);
    setFilterDateTo(range.to);
  };

  // Handle column sort
  const handleSort = (column: 'expense_name' | 'budget_allocated' | 'daily' | 'date_start') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get filtered and sorted entries
  const getFilteredAndSortedEntries = () => {
    let filtered = [...budgetEntries];

    // Apply date range filter - only show entries that overlap with selected range
    if (filterDateFrom && filterDateTo) {
      filtered = filtered.filter(entry => {
        const entryStart = new Date(entry.date_start);
        const entryEnd = new Date(entry.date_end);
        const filterStart = new Date(filterDateFrom);
        const filterEnd = new Date(filterDateTo);

        // Check if there's any overlap between the two date ranges
        // Overlap exists if: entry starts before filter ends AND entry ends after filter starts
        return entryStart <= filterEnd && entryEnd >= filterStart;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(entry =>
        entry.expense_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        if (sortColumn === 'expense_name') {
          aVal = a.expense_name.toLowerCase();
          bVal = b.expense_name.toLowerCase();
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else if (sortColumn === 'date_start') {
          aVal = new Date(a.date_start).getTime();
          bVal = new Date(b.date_start).getTime();
        } else {
          aVal = a[sortColumn];
          bVal = b[sortColumn];
        }

        if (sortDirection === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return filtered;
  };

  useEffect(() => {
    const currentMonth = getCurrentMonthRange();
    setFilterDateFrom(currentMonth.from);
    setFilterDateTo(currentMonth.to);
  }, []);

  useEffect(() => {
    if (filterDateFrom && filterDateTo) {
      fetchBudget();
    }
  }, [filterDateFrom, filterDateTo]);

  // clearForm
  const clearForm = () => {
    setExpenseName('');
    setBudgetAllocated('');
    setDateFrom('');
    setDateTo('');
    setAuthPassword('');
    setEditing(false);
    setSelectedBudgetId(null);
  };

  // handleRowClick
  const handleRowClick = (entry: BudgetEntry) => {
    setEditing(true);
    setSelectedBudgetId(entry.budget_id);
    setExpenseName(entry.expense_name);
    setBudgetAllocated(entry.budget_allocated.toString());
    setDateFrom(entry.date_start);
    setDateTo(entry.date_end);
    setAuthPassword('');
  };

  // handleAddOrEdit
  const handleAddOrEdit = async () => {
    if (!expenseName.trim() || !budgetAllocated || !dateFrom || !dateTo || !authPassword.trim()) {
      return setModalInfo({ show: true, title: "Missing Fields", message: "All fields are required.", type: "info" });
    }
    const budgetNum = parseFloat(budgetAllocated);

    if (isNaN(budgetNum) || budgetNum <= 0) {
      return setModalInfo({ show: true, title: "Invalid Budget", message: "Budget Allocated must be greater than 0.", type: "error" });
    }
    if (dateTo < dateFrom) {
      return setModalInfo({ show: true, title: "Invalid Date", message: "The 'To' date must be after the 'From' date.", type: "error" });
    }

    const payload = {
      action: editing ? 'update' : 'add',
      budgetId: selectedBudgetId,
      expenseName: expenseName.trim(),
      budgetAllocated: budgetNum,
      dateFrom: dateFrom,
      dateTo: dateTo,
      authPassword: authPassword
    };

    try {
      const response = await fetch(`${API_URL}manage_budget.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        setModalInfo({ show: true, title: "Success", message: result.message, type: "success" });
        clearForm();
        fetchBudget();
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  // handleDelete
  const handleDelete = async () => {
    if (!selectedBudgetId) {
      return setModalInfo({ show: true, title: "Error", message: "No entry selected.", type: "error" });
    }
    if (!authPassword.trim()) {
      return setModalInfo({ show: true, title: "Auth Required", message: "Please enter authentication password to delete.", type: "info" });
    }
    const isConfirmed = window.confirm(`Are you sure you want to delete the expense "${expenseName}"?`);
    if (!isConfirmed) return;

    const payload = {
      action: 'delete',
      budgetId: selectedBudgetId,
      authPassword: authPassword
    };
    try {
      const response = await fetch(`${API_URL}manage_budget.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setModalInfo({ show: true, title: "Success", message: result.message, type: "success" });
        clearForm();
        fetchBudget();
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  return (
    <div className="admin-budget-page">
      <SystemTitle />
      <AdminNavbar />

      <div className="admin-budget-container">
        <div className="budget-content-wrapper">
          {/* Left side - Table */}
          <div className="budget-table-section">
            <div className="budget-header">
              <h1>Budget Management</h1>
            </div>

            {/* Filter Section */}
            <div className="budget-filters">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Date Range:</label>
                  <div className="filter-date-inputs">
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="filter-control"
                    />
                    <span className="filter-separator">to</span>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="filter-control"
                    />
                  </div>
                </div>

                <div className="filter-shortcuts">
                  <button
                    className="shortcut-btn"
                    onClick={() => handleDateShortcut('today')}
                    title="Today"
                  >
                    <i className="bi bi-calendar-day"></i>
                    Today
                  </button>
                  <button
                    className="shortcut-btn"
                    onClick={() => handleDateShortcut('week')}
                    title="This Week"
                  >
                    <i className="bi bi-calendar-week"></i>
                    Week
                  </button>
                  <button
                    className="shortcut-btn"
                    onClick={() => handleDateShortcut('month')}
                    title="This Month"
                  >
                    <i className="bi bi-calendar-month"></i>
                    Month
                  </button>
                  <button
                    className="shortcut-btn"
                    onClick={() => handleDateShortcut('year')}
                    title="This Year"
                  >
                    <i className="bi bi-calendar"></i>
                    Year
                  </button>
                </div>
              </div>

              <div className="filter-group search-group">
                <label>Search Expense:</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by expense name..."
                  className="filter-control search-input"
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="budget-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('expense_name')} className="sortable">
                      Expense
                      {sortColumn === 'expense_name' && (
                        <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                    <th onClick={() => handleSort('budget_allocated')} className="sortable">
                      Budget (Allocated)
                      {sortColumn === 'budget_allocated' && (
                        <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                    <th onClick={() => handleSort('daily')} className="sortable">
                      Daily
                      {sortColumn === 'daily' && (
                        <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                    <th onClick={() => handleSort('date_start')} className="sortable">
                      Date Range
                      {sortColumn === 'date_start' && (
                        <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center">Loading...</td>
                    </tr>
                  ) : getFilteredAndSortedEntries().length > 0 ? (
                    getFilteredAndSortedEntries().map((entry) => (
                      <tr
                        key={entry.budget_id}
                        onClick={() => handleRowClick(entry)}
                        className={selectedBudgetId === entry.budget_id ? 'selected-row' : ''}
                      >
                        <td>{entry.expense_name}</td>
                        <td>₱{entry.budget_allocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>₱{entry.daily.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{entry.date_start} to {entry.date_end}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center">No budget entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right side - Form */}
          <div className={`budget-sidebar ${editing ? 'edit-mode' : 'add-mode'}`}>
            <div className="sidebar-header">
              <h2>
                <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'}`}></i>
                {editing ? 'Edit Budget' : 'Add Budget'}
              </h2>
              {editing && (
                <span className="edit-badge">Editing: {expenseName}</span>
              )}
            </div>

            <div className="sidebar-content">
              {/* Totals Display */}
              <div className="budget-totals">
                <div className="total-item">
                  <label>Gross Total (Sales):</label>
                  <div className="total-value gross">
                    ₱{totals.gross_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="total-item">
                  <label>Total Expenses:</label>
                  <div className="total-value expenses">
                    ₱{totals.total_expenses?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </div>
                </div>
                <div className="total-item">
                  <label>Net Income (Profit):</label>
                  <div className={`total-value net ${totals.net_total >= 0 ? 'positive' : 'negative'}`}>
                    ₱{totals.net_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="budget-form">
                <div className="form-group">
                  <label>Expense Name:</label>
                  <input
                    type="text"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    className="form-control"
                    placeholder='Enter expense name'
                  />
                </div>

                <div className="form-group">
                  <label>Budget Allocated:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={budgetAllocated}
                    onChange={(e) => setBudgetAllocated(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Date Range:</label>
                  <div className="date-inputs">
                    <div className="date-input-group">
                      <span className="date-label">From:</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="date-input-group">
                      <span className="date-label">To:</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Authentication Password:</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="form-control"
                    autoComplete="new-password"
                    placeholder='Enter admin password'
                  />
                </div>

                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleAddOrEdit}>
                    {editing ? 'Save Changes' : 'Add Budget'}
                  </button>
                  <button className="btn btn-secondary" onClick={clearForm}>
                    {editing ? 'Cancel' : 'Clear'}
                  </button>
                  {editing && (
                    <button className="btn btn-danger" onClick={handleDelete}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SettingsFooter />

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

export default AdminBudget;