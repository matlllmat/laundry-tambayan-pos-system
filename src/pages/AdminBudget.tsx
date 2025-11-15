import { useState, useEffect } from 'react';
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals"; 
import './AdminBudget.css';

// 1. Interface updated
interface BudgetEntry {
  budget_id: number;
  expense_name: string;
  budget_allocated: number;
  date_start: string;
  date_end: string;
  daily: number; // Added daily
}

const API_URL = 'http://localhost/laundry_tambayan_pos_system_backend/';

const AdminBudget = () => {
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [expenseName, setExpenseName] = useState('');
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Editing state
  const [editing, setEditing] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);

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
      const response = await fetch(`${API_URL}get_budget.php`);
      const result = await response.json();
      if (result.success) {
        setBudgetEntries(result.data);
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

  useEffect(() => {
    fetchBudget();
  }, []);

  // 2. --- REMOVED 'netTotal' and 'grossTotal' logic ---
  
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

  // 3. handleRowClick (no expense_cost)
  const handleRowClick = (entry: BudgetEntry) => {
    setEditing(true);
    setSelectedBudgetId(entry.budget_id);
    setExpenseName(entry.expense_name);
    setBudgetAllocated(entry.budget_allocated.toString()); 
    setDateFrom(entry.date_start);
    setDateTo(entry.date_end);
    setAuthPassword(''); 
  };

  // handleAddOrEdit (no expense_cost)
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
        fetchBudget(); // Refresh table
      } else {
        setModalInfo({ show: true, title: "Error", message: result.message, type: "error" });
      }
    } catch (error) {
      setModalInfo({ show: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
    }
  };

  // handleDelete (no change)
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
              <h1>Budget</h1>
            </div>
            <div className="table-responsive">
              <table className="table budget-table">
                {/* 4. Table headers updated */}
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Budget (Allocated)</th>
                    <th>Daily</th>
                    <th>Date Range</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // 5. ColSpan updated to 4
                    <tr><td colSpan={4} style={{ textAlign: "center" }}>Loading...</td></tr>
                  ) : budgetEntries.length > 0 ? (
                    budgetEntries.map((entry) => (
                      <tr 
                        key={entry.budget_id} 
                        onClick={() => handleRowClick(entry)}
                        className={selectedBudgetId === entry.budget_id ? 'selected-row' : ''}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{entry.expense_name}</td>
                        {/* 6. Table body shows allocated and daily */}
                        <td>₱{entry.budget_allocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>₱{entry.daily.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{entry.date_start} to {entry.date_end}</td>
                      </tr>
                    ))
                  ) : (
                     // 5. ColSpan updated to 4
                     <tr><td colSpan={4} style={{ textAlign: "center" }}>No budget entries found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="budget-sidebar">
            {/* 7. Totals are blank as requested */}
            <div className="budget-totals">
              <div className="total-item">
                  <label>Net total:</label>
                  <input
                    type="text"
                    value="" // Set to blank
                    readOnly
                    className="total-input"
                  />
              </div>
              <div className="total-item">
                  <label>Gross total:</label>
                  <input
                    type="text"
                    value="" // Set to blank
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

              {/* 8. Form only has budgetAllocated */}
              <div className="form-group">
                <label>Budget Allocated:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={budgetAllocated}
                  onChange={(e) => setBudgetAllocated(e.target.value)}
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
                  autoComplete="new-password"
                />
              </div>

              <div className="button-group">
                <button className="action-btn add-btn" onClick={handleAddOrEdit}>
                  {editing ? 'Save' : 'Add'}
                </button>
                <button className="action-btn cancel-btn" onClick={clearForm}>
                  Cancel
                </button>
                {editing && (
                    <button className="action-btn delete-btn" onClick={handleDelete}>
                        Delete
                    </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
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