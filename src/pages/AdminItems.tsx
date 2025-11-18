import { useState, useEffect } from 'react';
import './AdminItems.css';
import AdminNavbar from '../components/AdminNavbar';
import SystemTitle from '../components/SystemTitle';
import '../components/SystemTitle.css';
import CustomModal from "../components/Modals";
import SettingsFooter from "../components/SettingsFooter";

// Interface matches database
interface Item {
  item_id: number;
  item_name: string;
  item_type: string;
  item_price: number;
}

const API_URL = 'http://localhost/laundry_tambayan_pos_system_backend/';

const AdminItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('');
  const [price, setPrice] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showWrongPasswordModal, setShowWrongPasswordModal] = useState(false);
  const [showEmptyFieldsModal, setShowEmptyFieldsModal] = useState(false);
  const [showInvalidDataModal, setShowInvalidDataModal] = useState(false);
  const [apiError, setApiError] = useState({ show: false, message: "" });
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [pendingItemData, setPendingItemData] = useState<any>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      // 2. --- Filename is appended to the base URL ---
      const response = await fetch(`${API_URL}get_items.php`);
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
      } else {
        setApiError({ show: true, message: result.message || "Failed to fetch items." });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setApiError({ show: true, message: "A network error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddOrEdit = async () => {
    if (!itemName.trim() || !itemType || !price.trim() || !authPassword.trim()) {
      setShowEmptyFieldsModal(true);
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setShowInvalidDataModal(true);
      return;
    }

    const itemData = {
      action: selectedItemId === null ? 'add' : 'update',
      itemName: itemName.trim(),
      itemType: itemType,
      price: priceNum,
      authPassword: authPassword,
      itemId: selectedItemId
    };

    setPendingItemData(itemData);
    if (selectedItemId === null) {
      setShowAddConfirm(true);
    } else {
      setShowUpdateConfirm(true);
    }
  };

  const handleConfirmAddOrUpdate = async () => {
    // Close confirmation modals
    setShowAddConfirm(false);
    setShowUpdateConfirm(false);

    if (!pendingItemData) return;

    const url = `${API_URL}manage_items.php`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify(pendingItemData),
      });

      const result = await response.json();

      if (result.success) {
        // Show success modal
        setApiError({ show: true, message: result.message });
        clearForm();
        fetchItems(); // Refresh
      } else {
        if (result.message.includes("Authentication")) {
          setShowWrongPasswordModal(true);
        } else if (result.message.includes("required") || result.message.includes("Missing")) {
          setShowEmptyFieldsModal(true);
        } else if (result.message.includes("Price")) {
          setShowInvalidDataModal(true);
        } else {
          setApiError({ show: true, message: result.message || "An unknown error occurred." });
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      setApiError({ show: true, message: 'A network error occurred. Please try again.' });
    } finally {
      setPendingItemData(null);
    }
  };

  const handleDelete = async () => {
    if (!authPassword.trim()) {
      setApiError({ show: true, message: "Please enter the authentication password to delete." });
      return;
    }
    if (!selectedItemId) {
      setApiError({ show: true, message: "No item selected." });
      return;
    }

    // Show custom confirmation modal instead of browser confirm
    setShowDeleteConfirm(true);
  };

  // New function to handle confirmed deletion
  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false); // Close confirmation modal first

    const deleteData = {
      action: 'delete',
      itemId: selectedItemId,
      authPassword: authPassword
    };

    const url = `${API_URL}manage_items.php`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      });
      const result = await response.json();

      if (result.success) {
        clearForm();
        fetchItems(); // Refresh list
      } else {
        if (result.message.includes("Authentication")) {
          setShowWrongPasswordModal(true);
        } else {
          setApiError({ show: true, message: result.message || "Failed to delete item." });
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      setApiError({ show: true, message: "A network error occurred." });
    }
  };

  const clearForm = () => {
    setItemName('');
    setItemType('');
    setPrice('');
    setAuthPassword('');
    setSelectedItemId(null);
  };

  const handleRowClick = (item: Item) => {
    setSelectedItemId(item.item_id);
    setItemName(item.item_name);
    setItemType(item.item_type);
    setPrice(item.item_price.toString());
    setAuthPassword('');
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="admin-history-page">
      <AdminNavbar />
      <SystemTitle />

      <div className="admin-history-container">
        <div className="admin-content-wrapper">
          {/* Left side - Table */}
          <div className="items-table-container">
            <div className="items-header">
              <h1>Items</h1>
            </div>

            <div className="search-container">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control search-input"
              />
            </div>

            <div className="table-responsive">
              <table className="table items-table">
                <thead>
                  <tr>
                    <th>Item name</th>
                    <th>Item type</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={3} className="no-items-message">Loading...</td></tr>
                  ) : items
                    .filter((item) =>
                      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.item_type.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <tr
                        key={item.item_id}
                        onClick={() => handleRowClick(item)}
                        className={selectedItemId === item.item_id ? 'selected-row' : ''}
                      >
                        <td>{item.item_name}</td>
                        <td>{capitalize(item.item_type)}</td>
                        <td>₱{parseFloat(item.item_price.toString()).toFixed(2)}</td>
                      </tr>
                    ))}

                  {!isLoading && items.filter(
                    (item) =>
                      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.item_type.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                      <tr>
                        <td colSpan={3} className="no-items-message">
                          No items found
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right side - Form */}
          {/* Right side - Form */}
          <div className={`admin-sidebar ${selectedItemId !== null ? 'edit-mode' : 'add-mode'}`}>
            <div className="sidebar-header">
              <h2>
                {selectedItemId === null ? (
                  <>
                    <i className="bi bi-plus-circle"></i> Add Item
                  </>
                ) : (
                  <>
                    <i className="bi bi-pencil-square"></i> Edit Item
                  </>
                )}
              </h2>
              {selectedItemId !== null && (
                <span className="edit-badge">Editing: {itemName}</span>
              )}
            </div>

            <div className="form-group">
              <label>Item Name:</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="form-control admin-input"
                placeholder="Enter item name"
              />
            </div>

            <div className="form-group">
              <label>Item Type:</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="form-control admin-input"
              >
                <option value="">Select type</option>
                <option value="service">Service</option>
                <option value="addon">Addons</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="form-group">
              <label>Price:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="form-control admin-input"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label>Authentication Password:</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="form-control admin-input"
                autoComplete="new-password"
                placeholder="Enter admin password"
              />
            </div>

            <div className="button-group">

              <div className="top-row">
                <button onClick={handleAddOrEdit} className="action-btn add-btn">
                  {selectedItemId === null ? 'Add' : 'Save'}
                </button>

                <button onClick={clearForm} className="action-btn cancel-btn">
                  {selectedItemId === null ? 'Clear' : 'Cancel'}
                </button>
              </div>

              {selectedItemId !== null && (
                <button onClick={handleDelete} className="action-btn delete-btn">
                  Delete
                </button>
              )}

            </div>

          </div>
        </div>
        < SettingsFooter />
      </div>

      {/* Modals */}
      <CustomModal
        show={showAddConfirm}
        title="Confirm Add Item"
        message={`Are you sure you want to add "${itemName}" as a ${itemType} with price ₱${parseFloat(price || '0').toFixed(2)}?`}
        onClose={() => {
          setShowAddConfirm(false);
          setPendingItemData(null);
        }}
        onConfirm={handleConfirmAddOrUpdate}
        type="confirm"
        confirmText="Add Item"
        cancelText="Cancel"
      />

      <CustomModal
        show={showUpdateConfirm}
        title="Confirm Update Item"
        message={`Are you sure you want to update "${itemName}" with the new information?`}
        onClose={() => {
          setShowUpdateConfirm(false);
          setPendingItemData(null);
        }}
        onConfirm={handleConfirmAddOrUpdate}
        type="confirm"
        confirmText="Save Changes"
        cancelText="Cancel"
      />
      <CustomModal
        show={showDeleteConfirm}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        type="confirm"
        confirmText="Delete"
        cancelText="Cancel"
      />
      <CustomModal
        show={showWrongPasswordModal}
        title="Authentication Failed"
        message="The authentication password is incorrect. Please try again."
        onClose={() => setShowWrongPasswordModal(false)}
        type="error"
      />
      <CustomModal
        show={showEmptyFieldsModal}
        title="Missing Information"
        message="All fields must be filled. Please complete the form before proceeding."
        onClose={() => setShowEmptyFieldsModal(false)}
        type="info"
      />
      <CustomModal
        show={showInvalidDataModal}
        title="Invalid Data"
        message="Please enter a valid price (must be a positive number)."
        onClose={() => setShowInvalidDataModal(false)}
        type="error"
      />
      <CustomModal
        show={apiError.show}
        title={apiError.message.includes("success") ? "Success" : "Error"}
        message={apiError.message}
        onClose={() => setApiError({ show: false, message: "" })}
        type={apiError.message.includes("success") ? "success" : "error"}
      />
    </div >
  );
};

export default AdminItems;