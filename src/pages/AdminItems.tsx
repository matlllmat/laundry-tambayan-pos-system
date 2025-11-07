import { useState } from 'react';
import './AdminItems.css';
import AdminNavbar from '../components/AdminNavbar';
import SystemTitle from '../components/SystemTitle';
import '../components/SystemTitle.css';
import CustomModal from "../components/Modals";

interface Item {
  id: number;
  itemName: string;
  itemType: string;
  price: number;
}

const AdminItems = () => {
  const [items, setItems] = useState<Item[]>([
    { id: 1, itemName: 'Wash and Fold', itemType: 'Service', price: 50 },
    { id: 2, itemName: 'Dry Clean', itemType: 'Service', price: 80 },
    { id: 3, itemName: 'Detergent', itemType: 'Addons', price: 15 },
    { id: 4, itemName: 'Fabric Softener', itemType: 'Addons', price: 20 },
    { id: 5, itemName: 'Press and Iron', itemType: 'Service', price: 30 },
  ]);

  const ADMIN_PASSWORD = 'admin123';

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('');
  const [price, setPrice] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showWrongPasswordModal, setShowWrongPasswordModal] = useState(false);
  const [showEmptyFieldsModal, setShowEmptyFieldsModal] = useState(false);
  const [showInvalidDataModal, setShowInvalidDataModal] = useState(false);

  // Add or Update handler
  const handleAddOrEdit = () => {
    if (!itemName.trim() || !itemType || !price.trim() || !authPassword.trim()) {
      setShowEmptyFieldsModal(true);
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setShowInvalidDataModal(true);
      return;
    }

    if (authPassword !== ADMIN_PASSWORD) {
      setShowWrongPasswordModal(true);
      return;
    }

    if (selectedItemId === null) {
      // ADD MODE
      const newItem: Item = {
        id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
        itemName: itemName.trim(),
        itemType,
        price: priceNum,
      };
      setItems([...items, newItem]);
    } else {
      // EDIT MODE
      const updatedItems = items.map(item =>
        item.id === selectedItemId
          ? { ...item, itemName: itemName.trim(), itemType, price: priceNum }
          : item
      );
      setItems(updatedItems);
    }

    clearForm();
  };

  const clearForm = () => {
    setItemName('');
    setItemType('');
    setPrice('');
    setAuthPassword('');
    setSelectedItemId(null);
  };

  const handleRowClick = (item: Item) => {
    setSelectedItemId(item.id);
    setItemName(item.itemName);
    setItemType(item.itemType);
    setPrice(item.price.toString());
    setAuthPassword('');
  };

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
                  {items
                    .filter((item) =>
                      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.itemType.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className={selectedItemId === item.id ? 'selected-row' : ''}
                      >
                        <td>{item.itemName}</td>
                        <td>{item.itemType}</td>
                        <td>₱{item.price.toFixed(2)}</td>
                      </tr>
                    ))}

                  {items.filter(
                    (item) =>
                      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.itemType.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="admin-sidebar">
            <div className="form-group">
              <label>Item Name:</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="form-control admin-input"
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
                <option value="Service">Service</option>
                <option value="Addons">Addons</option>
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
              />
            </div>

            <div className="button-group">
              <button onClick={handleAddOrEdit} className="action-btn add-btn">
                {selectedItemId === null ? 'Add' : 'Save'}
              </button>
              <button onClick={clearForm} className="action-btn cancel-btn">
                {selectedItemId === null ? 'Clear' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
    </div>
  );
};

export default AdminItems;
