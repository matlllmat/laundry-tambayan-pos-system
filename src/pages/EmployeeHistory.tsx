import React, { useState, useEffect } from "react";
import "./EmployeeHistory.css";
import EmployeeNavbar from "../components/EmployeeNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";

interface Item {
    item_id: number;
    item_name: string;
    item_type: 'service' | 'addon';
    item_price: number;
}

interface OrderItem {
    order_item_id?: number;
    order_id: number;
    service_name: string;
    price: number;
    quantity: number;
    calculated_amount: number;
}

interface Order {
    order_id: number;
    employee_id: number;
    total_weight: number;
    total_load: number;
    total_amount: number;
    customer_name: string;
    contact: string;
    address: string;
    schedule_type: string;
    schedule_date: string;
    created_at: string;
    order_status: string;
}

interface Transaction {
    order: Order;
    items: OrderItem[];
}

interface EditFormItem {
    item_name: string;
    price: number;
    type: 'service' | 'addon';
    quantity: number;
}

const EmployeeHistory: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Order | null;
        direction: "asc" | "desc";
    }>({ key: null, direction: "asc" });
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Modal state
    const [modalConfig, setModalConfig] = useState({
        show: false,
        title: "",
        message: "",
        type: "info" as "info" | "confirm" | "error" | "success",
        onConfirm: () => { },
    });

    // Edit form state
    const [editForm, setEditForm] = useState({
        total_weight: "",
        customer_name: "",
        contact: "",
        address: "",
        schedule_type: "pickup",
        schedule_date: "",
        password: "",
        selectedItems: [] as EditFormItem[],
        originalItems: [] as string[] // Track original item names. Prevents accidental removal.
    });

    // Dropdown selections
    const [selectedService, setSelectedService] = useState("");
    const [selectedAddon, setSelectedAddon] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionRes, ordersRes, itemsRes, catalogRes] = await Promise.all([
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/helpers/check_session.php", {
                        credentials: "include"
                    }),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_orders.php"),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_order_items.php"),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_items.php")
                ]);

                const sessionData = await sessionRes.json();
                const ordersData = await ordersRes.json();
                const itemsData = await itemsRes.json();
                const catalogData = await catalogRes.json();

                if (sessionData.logged_in) {
                    setCurrentUserId(sessionData.user.id);
                }

                setOrders(ordersData);
                setOrderItems(itemsData);

                if (catalogData.success) {
                    setItems(catalogData.data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Get services and addons from items
    const services = items.filter(item => item.item_type === 'service');
    const addons = items.filter(item => item.item_type === 'addon');

    // Auto-calculate order status based on date
    const calculateOrderStatus = (order: Order): string => {
        if (order.order_status === "completed") return "completed";

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const scheduleDate = new Date(order.schedule_date);
        scheduleDate.setHours(0, 0, 0, 0);

        if (scheduleDate >= currentDate) {
            return "pending";
        } else {
            return order.schedule_type === "delivery" ? "late" : "unclaimed";
        }
    };

    // Get status badge class
    const getStatusClass = (status: string): string => {
        switch (status) {
            case "pending": return "status-badge status-pending";
            case "completed": return "status-badge status-completed";
            case "late": return "status-badge status-late";
            case "unclaimed": return "status-badge status-unclaimed";
            default: return "status-badge";
        }
    };

    // Filter transactions based on search
    const filteredOrders = orders.filter((order) =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_id.toString().includes(searchTerm.toLowerCase())
    );

    // Sort transactions
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "total_amount" || sortConfig.key === "total_weight" || sortConfig.key === "order_id") {
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
    const handleSort = (key: keyof Order) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Get sort indicator
    const getSortIndicator = (columnName: keyof Order) => {
        if (sortConfig.key === columnName) {
            return sortConfig.direction === "asc" ? "▲" : "▼";
        }
        return "";
    };

    // Handle row click to show receipt
    const handleRowClick = (order: Order) => {
        const items = orderItems.filter(item => item.order_id === order.order_id);
        const currentStatus = calculateOrderStatus(order);

        setSelectedTransaction({
            order: { ...order, order_status: currentStatus },
            items
        });
        setShowReceipt(true);
        setIsEditMode(false);
    };

    // Determine item type (service or addon) based on catalog
    const getItemType = (itemName: string): 'service' | 'addon' => {
        const foundService = services.find(s => s.item_name === itemName);
        if (foundService) return 'service';
        return 'addon';
    };

    // Initialize edit form
    const handleEditClick = () => {
        if (!selectedTransaction) return;

        const { order, items } = selectedTransaction;
        const selectedItems = items.map(item => ({
            item_name: item.service_name,
            price: Number(item.price),
            type: getItemType(item.service_name),
            quantity: item.quantity || 1
        }));

        // Store original item names for warning check
        const originalItemNames = items.map(item => item.service_name);

        setEditForm({
            total_weight: order.total_weight.toString(),
            customer_name: order.customer_name,
            contact: order.contact,
            address: order.address,
            schedule_type: order.schedule_type,
            schedule_date: order.schedule_date,
            password: "",
            selectedItems,
            originalItems: originalItemNames
        });
        setSelectedService("");
        setSelectedAddon("");
        setIsEditMode(true);
    };

    // Add service to order
    const handleAddService = () => {
        if (!selectedService) return;

        const service = services.find(s => s.item_name === selectedService);
        if (!service) return;

        // Check if already added
        if (editForm.selectedItems.some(item => item.item_name === selectedService)) {
            setModalConfig({
                show: true,
                title: "Already Added",
                message: "This service has already been added to the order.",
                type: "error",
                onConfirm: () => { }
            });
            return;
        }

        setEditForm(prev => ({
            ...prev,
            selectedItems: [...prev.selectedItems, {
                item_name: service.item_name,
                price: service.item_price,
                type: 'service',
                quantity: Number(prev.total_weight) ? Math.ceil(Number(prev.total_weight) / 7) : 0
            }]
        }));
        setSelectedService("");
    };

    // Add addon to order
    const handleAddAddon = () => {
        if (!selectedAddon) return;

        const addon = addons.find(a => a.item_name === selectedAddon);
        if (!addon) return;

        // Check if already added - if yes, increment quantity
        const existingAddon = editForm.selectedItems.find(item => item.item_name === selectedAddon);
        if (existingAddon) {
            setEditForm(prev => ({
                ...prev,
                selectedItems: prev.selectedItems.map(item =>
                    item.item_name === selectedAddon
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }));
        } else {
            // Add new addon with quantity 1
            setEditForm(prev => ({
                ...prev,
                selectedItems: [...prev.selectedItems, {
                    item_name: addon.item_name,
                    price: addon.item_price,
                    type: 'addon',
                    quantity: 1
                }]
            }));
        }
        setSelectedAddon("");
    };

    // Remove item from order completely
    const handleRemoveItem = (itemName: string) => {
        // Check if this is an original item
        const isOriginalItem = editForm.originalItems.includes(itemName);

        if (isOriginalItem) {
            setModalConfig({
                show: true,
                title: "Remove Original Item",
                message: `Are you sure you want to remove "${itemName}"? This item was part of the original order.`,
                type: "confirm",
                onConfirm: () => {
                    setEditForm(prev => ({
                        ...prev,
                        selectedItems: prev.selectedItems.filter(item => item.item_name !== itemName)
                    }));
                    setModalConfig({ ...modalConfig, show: false });
                }
            });
        } else {
            // Newly added item, remove without warning
            setEditForm(prev => ({
                ...prev,
                selectedItems: prev.selectedItems.filter(item => item.item_name !== itemName)
            }));
        }
    };

    // Increment addon quantity
    const handleIncrementAddon = (itemName: string) => {
        setEditForm(prev => ({
            ...prev,
            selectedItems: prev.selectedItems.map(item =>
                item.item_name === itemName && item.type === 'addon'
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        }));
    };

    // Decrement addon quantity (remove if reaches 0)
    const handleDecrementAddon = (itemName: string) => {
        setEditForm(prev => ({
            ...prev,
            selectedItems: prev.selectedItems
                .map(item =>
                    item.item_name === itemName && item.type === 'addon'
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter(item => item.type === 'service' || item.quantity > 0)
        }));
    };

    // Update service quantities when load weight changes
    useEffect(() => {
        if (isEditMode && editForm.total_weight) {
            const weight = Number(editForm.total_weight);
            const loads = Math.ceil(weight / 7);

            setEditForm(prev => ({
                ...prev,
                selectedItems: prev.selectedItems.map(item =>
                    item.type === 'service'
                        ? { ...item, quantity: loads }
                        : item
                )
            }));
        }
    }, [editForm.total_weight, isEditMode]);

    // Auto-add/remove delivery fee when schedule type changes in edit mode
    useEffect(() => {
        if (!isEditMode) return;

        const deliveryFee = {
            item_name: "Delivery Fee",
            price: 50,
            type: 'service' as const,
            quantity: 1
        };

        if (editForm.schedule_type === "delivery") {
            // Add delivery fee if not already present
            setEditForm(prev => {
                const hasDeliveryFee = prev.selectedItems.some(item => item.item_name === "Delivery Fee");
                if (!hasDeliveryFee) {
                    return {
                        ...prev,
                        selectedItems: [...prev.selectedItems, deliveryFee]
                    };
                }
                return prev;
            });
        } else {
            // Remove delivery fee when switching to pickup
            setEditForm(prev => ({
                ...prev,
                selectedItems: prev.selectedItems.filter(item => item.item_name !== "Delivery Fee")
            }));
        }
    }, [editForm.schedule_type, isEditMode]);

    // Calculate totals based on edit form
    const calculateEditTotals = () => {
        const weight = Number(editForm.total_weight) || 0;
        const loads = Math.ceil(weight / 7);
        const amount = editForm.selectedItems.reduce((sum, item) => {
            return sum + (Number(item.price) * item.quantity);
        }, 0);

        return { loads, amount };
    };

    // Validate phone number
    const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(phone);
    };

    // Handle save changes
    const handleSaveChanges = async () => {
        if (!selectedTransaction || !currentUserId) return;

        // Validation
        if (!editForm.customer_name || !editForm.schedule_date || !editForm.total_weight) {
            setModalConfig({
                show: true,
                title: "Invalid Input",
                message: "Please fill out all required fields (Customer Name, Schedule Date, Load Weight).",
                type: "error",
                onConfirm: () => { }
            });
            return;
        }

        // Check if at least one service is selected
        const hasService = editForm.selectedItems.some(item => item.type === 'service');
        if (!hasService) {
            setModalConfig({
                show: true,
                title: "No Service Selected",
                message: "Please select at least one service.",
                type: "error",
                onConfirm: () => { }
            });
            return;
        }

        // Delivery validation
        if (editForm.schedule_type === "delivery") {
            if (!editForm.contact || !editForm.address) {
                setModalConfig({
                    show: true,
                    title: "Invalid Input",
                    message: "Contact Number and Address are required for delivery orders.",
                    type: "error",
                    onConfirm: () => { }
                });
                return;
            }

            if (!validatePhone(editForm.contact)) {
                setModalConfig({
                    show: true,
                    title: "Invalid Phone Number",
                    message: "Contact number must be 11 digits starting with 09 (e.g., 09171234567).",
                    type: "error",
                    onConfirm: () => { }
                });
                return;
            }
        }

        // Password validation using our almighty backend
        try {
            const verifyResponse = await fetch("http://localhost/laundry_tambayan_pos_system_backend/verify_employee_password.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ password: editForm.password })
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResult.success) {
                setModalConfig({
                    show: true,
                    title: "Authentication Failed",
                    message: verifyResult.message || "Incorrect password. Please try again.",
                    type: "error",
                    onConfirm: () => { }
                });
                return;
            }

            // Calculate new totals
            const { loads, amount } = calculateEditTotals();

            // Show confirmation
            setModalConfig({
                show: true,
                title: "Confirm Changes",
                message: "Are you sure you want to save these changes?",
                type: "confirm",
                onConfirm: () => {
                    saveChanges(loads, amount);
                }
            });

        } catch (error) {
            console.error("Error verifying password:", error);
            setModalConfig({
                show: true,
                title: "Error",
                message: "Failed to verify password. Please try again.",
                type: "error",
                onConfirm: () => { }
            });
        }
    };

    const saveChanges = async (loads: number, amount: number) => {
        if (!selectedTransaction) return;

        const orderId = selectedTransaction.order.order_id;

        // Prepare the new order data
        const updatedOrderData = {
            order_id: orderId,
            total_weight: Number(editForm.total_weight),
            total_load: loads,
            total_amount: amount,
            customer_name: editForm.customer_name,
            contact: editForm.contact,
            address: editForm.address,
            schedule_type: editForm.schedule_type,
            schedule_date: editForm.schedule_date
        };

        // Prepare new order items
        const newItems: OrderItem[] = editForm.selectedItems.map(item => ({
            order_id: orderId,
            service_name: item.item_name,
            price: Number(item.price),
            quantity: item.quantity,
            calculated_amount: Number(item.price) * item.quantity
        }));

        try {
            // Update order
            const orderResponse = await fetch("http://localhost/laundry_tambayan_pos_system_backend/update_order.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedOrderData)
            });

            const orderResult = await orderResponse.json();

            // Update order items 
            const itemsResponse = await fetch("http://localhost/laundry_tambayan_pos_system_backend/update_order_items.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: orderId, items: newItems })
            });

            const itemsResult = await itemsResponse.json();

            // If both updates succeeded
            if (orderResult.success && itemsResult.success) {

                // Update local state for immediate UI reflection
                setOrders(prev => prev.map(order =>
                    order.order_id === orderId ? { ...order, ...updatedOrderData } : order
                ));

                setOrderItems(prev => [
                    ...prev.filter(item => item.order_id !== orderId),
                    ...newItems
                ]);

                setSelectedTransaction({
                    order: {
                        ...selectedTransaction.order,
                        ...updatedOrderData
                    },
                    items: newItems
                });

                setIsEditMode(false);

                // Show success modal
                setModalConfig({
                    show: true,
                    title: "Success",
                    message: "Order has been updated successfully!",
                    type: "success",
                    onConfirm: () => { }
                });
            } else {
                throw new Error(orderResult.error || itemsResult.error || "Failed to update order.");
            }

        } catch (error) {
            console.error("Error saving order changes:", error);

            setModalConfig({
                show: true,
                title: "Error",
                message: "Failed to update order. Please try again.",
                type: "error",
                onConfirm: () => { }
            });
        }
    };

    // Cancel edit mode
    const handleCancelEdit = () => {
        setModalConfig({
            show: true,
            title: "Cancel Changes",
            message: "Are you sure you want to cancel? All changes will be lost.",
            type: "confirm",
            onConfirm: () => {
                setIsEditMode(false);
                setModalConfig({ ...modalConfig, show: false });
            }
        });
    };

    const { loads: editLoads, amount: editAmount } = isEditMode ? calculateEditTotals() : { loads: 0, amount: 0 };

    if (loading) {
        return (
            <div className="history-page">
                <EmployeeNavbar />
                <SystemTitle />
                <div className="loading-message">Loading transactions...</div>
            </div>
        );
    }

    return (
        <div className="history-page">
            <EmployeeNavbar />
            <SystemTitle />

            <div className="history-container">
                <h2 className="history-title">Transaction History</h2>
                <div className="separator"></div>
                <h3 className="history-subtitle">All Transaction History</h3>
                <div className="filter-section">
                    <input
                        type="text"
                        placeholder="Search by customer name or order number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="filter-input"
                    />
                </div>

                <div className="table-container">
                    <table className="transaction-table">
                        <thead>
                            <tr className="history-header">
                                <th onClick={() => handleSort("order_id")}>
                                    Order # <span>{getSortIndicator("order_id")}</span>
                                </th>
                                <th onClick={() => handleSort("customer_name")}>
                                    Customer Name <span>{getSortIndicator("customer_name")}</span>
                                </th>
                                <th onClick={() => handleSort("created_at")}>
                                    Date of Transaction <span>{getSortIndicator("created_at")}</span>
                                </th>
                                <th onClick={() => handleSort("total_amount")}>
                                    Amount <span>{getSortIndicator("total_amount")}</span>
                                </th>
                                <th>
                                    Order Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.map((order) => {
                                const status = calculateOrderStatus(order);
                                return (
                                    <tr
                                        key={order.order_id}
                                        className="clickable-row"
                                        onClick={() => handleRowClick(order)}
                                    >
                                        <td>{order.order_id}</td>
                                        <td>{order.customer_name}</td>
                                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td>₱{order.total_amount}</td>
                                        <td>
                                            <span className={getStatusClass(status)}>
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && selectedTransaction && (
                <div className="receipt-modal-overlay" onClick={() => !isEditMode && setShowReceipt(false)}>
                    <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="receipt-header">
                            <h2>{isEditMode ? "Edit Order Details" : "Transaction Receipt"}</h2>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    if (isEditMode) {
                                        handleCancelEdit();
                                    } else {
                                        setShowReceipt(false);
                                    }
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="receipt-content">
                            {!isEditMode ? (
                                // VIEW MODE
                                <>
                                    <div className="receipt-section">
                                        <h3>Order Information</h3>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Order ID:</span>
                                            <span className="receipt-value">{selectedTransaction.order.order_id}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Employee ID:</span>
                                            <span className="receipt-value">{selectedTransaction.order.employee_id}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Customer Name:</span>
                                            <span className="receipt-value">{selectedTransaction.order.customer_name}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Transaction Date:</span>
                                            <span className="receipt-value">
                                                {new Date(selectedTransaction.order.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Order Status:</span>
                                            <span className={getStatusClass(selectedTransaction.order.order_status)}>
                                                {selectedTransaction.order.order_status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="receipt-section">
                                        <h3>Service Details</h3>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Load Weight:</span>
                                            <span className="receipt-value">{Number(selectedTransaction.order.total_weight).toFixed(2)} KG</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Number of Loads:</span>
                                            <span className="receipt-value">{selectedTransaction.order.total_load}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Schedule Type:</span>
                                            <span className="receipt-value">{selectedTransaction.order.schedule_type.toUpperCase()}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Schedule Date:</span>
                                            <span className="receipt-value">{selectedTransaction.order.schedule_date}</span>
                                        </div>
                                        {selectedTransaction.order.schedule_type === "delivery" && (
                                            <>
                                                <div className="receipt-row">
                                                    <span className="receipt-label">Contact No.:</span>
                                                    <span className="receipt-value">{selectedTransaction.order.contact}</span>
                                                </div>
                                                <div className="receipt-row">
                                                    <span className="receipt-label">Address:</span>
                                                    <span className="receipt-value">{selectedTransaction.order.address}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="receipt-section">
                                        <h3>Service Items</h3>
                                        <table className="receipt-items-table">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Type</th>
                                                    <th>Price</th>
                                                    <th>Qty</th>
                                                    <th>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTransaction.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.service_name}</td>
                                                        <td>{getItemType(item.service_name) === 'service' ? 'Service' : 'Addon'}</td>
                                                        <td>₱{Number(item.price).toFixed(2)}</td>
                                                        <td>{item.quantity || 1}</td>
                                                        <td>₱{Number(item.calculated_amount).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="receipt-total">
                                        <span className="total-label">TOTAL AMOUNT:</span>
                                        <span className="total-value">₱{Number(selectedTransaction.order.total_amount).toFixed(2)}</span>
                                    </div>

                                    {selectedTransaction.order.order_status !== "completed" && (
                                        <div className="edit-button-container">
                                            <button
                                                onClick={handleEditClick}
                                                className="edit-order-btn"
                                            >
                                                Edit Order Details
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // EDIT MODE
                                <>
                                    <div className="receipt-section">
                                        <h3>Order Information (Read-Only)</h3>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Order ID:</span>
                                            <span className="receipt-value">{selectedTransaction.order.order_id}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Employee ID:</span>
                                            <span className="receipt-value">{selectedTransaction.order.employee_id}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Transaction Date:</span>
                                            <span className="receipt-value">
                                                {new Date(selectedTransaction.order.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="receipt-section">
                                        <h3>Editable Fields</h3>

                                        <div className="edit-field">
                                            <label>Customer Name:</label>
                                            <input
                                                type="text"
                                                value={editForm.customer_name}
                                                onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                                                className="edit-input"
                                            />
                                        </div>

                                        <div className="edit-field">
                                            <label>Load Weight (KG):</label>
                                            <input
                                                type="number"
                                                value={editForm.total_weight}
                                                onChange={(e) => setEditForm({ ...editForm, total_weight: e.target.value })}
                                                className="edit-input"
                                            />
                                        </div>

                                        <div className="edit-field">
                                            <label>Number of Loads:</label>
                                            <input
                                                type="text"
                                                value={editLoads}
                                                readOnly
                                                disabled
                                                className="edit-input edit-input-disabled"
                                            />
                                        </div>

                                        <div className="edit-field">
                                            <label>Schedule Type:</label>
                                            <select
                                                value={editForm.schedule_type}
                                                onChange={(e) => setEditForm({ ...editForm, schedule_type: e.target.value })}
                                                className="edit-input"
                                            >
                                                <option value="pickup">Pickup</option>
                                                <option value="delivery">Delivery</option>
                                            </select>
                                        </div>

                                        <div className="edit-field">
                                            <label>Schedule Date:</label>
                                            <input
                                                type="date"
                                                value={editForm.schedule_date}
                                                onChange={(e) => setEditForm({ ...editForm, schedule_date: e.target.value })}
                                                className="edit-input"
                                            />
                                        </div>

                                        {editForm.schedule_type === "delivery" && (
                                            <>
                                                <div className="edit-field">
                                                    <label>Contact No. <span className="required-asterisk">*</span>:</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.contact}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '');
                                                            if (value.length <= 11) {
                                                                setEditForm({ ...editForm, contact: value });
                                                            }
                                                        }}
                                                        placeholder="09171234567"
                                                        maxLength={11}
                                                        className="edit-input"
                                                    />
                                                </div>

                                                <div className="edit-field">
                                                    <label>Address <span className="required-asterisk">*</span>:</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.address}
                                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                        placeholder="Complete address"
                                                        className="edit-input"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="receipt-section">
                                        <h3>Services & Add-ons</h3>

                                        <div className="dropdown-add-container">
                                            <select
                                                value={selectedService}
                                                onChange={(e) => setSelectedService(e.target.value)}
                                                className="edit-input"
                                            >
                                                <option value="">Select Service</option>
                                                {services.map(service => (
                                                    <option key={service.item_id} value={service.item_name}>
                                                        {service.item_name} (₱{service.item_price})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleAddService}
                                                className="add-item-btn"
                                                disabled={!selectedService || editForm.selectedItems.some(item => item.item_name === selectedService)}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="dropdown-add-container">
                                            <select
                                                value={selectedAddon}
                                                onChange={(e) => setSelectedAddon(e.target.value)}
                                                className="edit-input"
                                            >
                                                <option value="">Select Addon</option>
                                                {addons.map(addon => (
                                                    <option key={addon.item_id} value={addon.item_name}>
                                                        {addon.item_name} (₱{addon.item_price})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleAddAddon}
                                                className="add-item-btn"
                                                disabled={!selectedAddon}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#1c2f4a' }}>Selected Items</h4>
                                        {editForm.selectedItems.length === 0 ? (
                                            <p className="no-items-message">No items selected yet</p>
                                        ) : (
                                            <div className="edit-items-table-container">
                                                <table className="edit-items-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Item</th>
                                                            <th>Type</th>
                                                            <th>Price</th>
                                                            <th>Qty</th>
                                                            <th>Subtotal</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {editForm.selectedItems.map((item, index) => (
                                                            <tr key={index}>
                                                                <td style={{ textAlign: 'left' }}>{item.item_name}</td>
                                                                <td>{item.type === 'service' ? 'Service' : 'Addon'}</td>
                                                                <td>₱{Number(item.price).toFixed(2)}</td>
                                                                <td>{item.quantity}</td>
                                                                <td>₱{(Number(item.price) * item.quantity).toFixed(2)}</td>
                                                                <td>
                                                                    {item.item_name === "Delivery Fee" ? (
                                                                        <span style={{
                                                                            color: '#666',
                                                                            fontStyle: 'italic',
                                                                            fontSize: '0.85rem'
                                                                        }}>
                                                                            Auto
                                                                        </span>
                                                                    ) : item.type === 'service' ? (
                                                                        <button
                                                                            className="action-btn remove-btn"
                                                                            onClick={() => handleRemoveItem(item.item_name)}
                                                                            title="Remove"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    ) : (
                                                                        <div className="addon-controls">
                                                                            <button
                                                                                className="action-btn decrement-btn"
                                                                                onClick={() => handleDecrementAddon(item.item_name)}
                                                                                title="Decrease"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <button
                                                                                className="action-btn increment-btn"
                                                                                onClick={() => handleIncrementAddon(item.item_name)}
                                                                                title="Increase"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="receipt-total">
                                        <span className="total-label">Total Amount:</span>
                                        <span className="total-value">₱{editAmount.toFixed(2)}</span>
                                    </div>

                                    <div className="receipt-section">
                                        <h3>Authentication</h3>
                                        <div className="edit-field">
                                            <label>Password <span className="required-asterisk">*</span>:</label>
                                            <input
                                                type="password"
                                                value={editForm.password}
                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                placeholder="Enter password to save changes"
                                                className="edit-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="edit-actions">
                                        <button
                                            onClick={handleSaveChanges}
                                            className="save-btn"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <CustomModal
                show={modalConfig.show}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => setModalConfig({ ...modalConfig, show: false })}
                onConfirm={modalConfig.onConfirm}
            />
        </div>
    );
};

export default EmployeeHistory;