import React, { useState, useEffect } from "react";
import "./History.css";
import EmployeeNavbar from "../components/EmployeeNavbar";
import AdminNavbar from "../components/AdminNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";
import SettingsFooter from "../components/SettingsFooter";

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
    employee_name?: string;
    total_weight: number;
    total_load: number;
    weight_per_load_snapshot: number;
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

const History: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Order | "order_status" | null;
        direction: "asc" | "desc";
    }>({ key: "order_id", direction: "desc" });

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [hasUserEditedWeight, setHasUserEditedWeight] = useState(false);
    const [useCurrentPrices, setUseCurrentPrices] = useState(false);
    const [originalWeightPerLoad, setOriginalWeightPerLoad] = useState<number>(7);

    // Add near other modal states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Add this function after handleCancelEdit
    const handleDeleteOrder = async () => {
        if (!selectedTransaction || !deletePassword) {
            setModalConfig({
                show: true,
                title: "Password Required",
                message: "Please enter your password to delete this order.",
                type: "error",
                onConfirm: () => { }
            });
            return;
        }

        setIsDeleting(true);

        try {
            // Verify password first
            const verifyResponse = await fetch(
                "http://localhost/laundry_tambayan_pos_system_backend/verify_employee_password.php",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ password: deletePassword })
                }
            );

            const verifyResult = await verifyResponse.json();

            if (!verifyResult.success) {
                setModalConfig({
                    show: true,
                    title: "Authentication Failed",
                    message: "Incorrect password. Please try again.",
                    type: "error",
                    onConfirm: () => { }
                });
                setDeletePassword("");
                setIsDeleting(false);
                return;
            }

            // Delete order
            const deleteResponse = await fetch(
                "http://localhost/laundry_tambayan_pos_system_backend/delete_order.php",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        order_id: selectedTransaction.order.order_id
                    })
                }
            );

            const deleteResult = await deleteResponse.json();

            if (deleteResult.success) {
                // Remove from local state
                setOrders(prev => prev.filter(o => o.order_id !== selectedTransaction.order.order_id));
                setOrderItems(prev => prev.filter(i => i.order_id !== selectedTransaction.order.order_id));

                // Close modals and show success
                setShowDeleteConfirm(false);
                setShowReceipt(false);
                setDeletePassword("");

                setModalConfig({
                    show: true,
                    title: "Order Deleted",
                    message: "The order has been permanently deleted.",
                    type: "success",
                    onConfirm: () => { }
                });
            } else {
                throw new Error(deleteResult.message || "Failed to delete order");
            }
        } catch (error) {
            console.error("Error deleting order:", error);
            setModalConfig({
                show: true,
                title: "Delete Failed",
                message: "Failed to delete order. Please try again.",
                type: "error",
                onConfirm: () => { }
            });
        } finally {
            setIsDeleting(false);
        }
    };

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

    // Settings state
    const [settings, setSettings] = useState<{ [key: string]: string }>({});
    const [loadLimit, setLoadLimit] = useState<number>(30);
    const [weightPerLoad, setWeightPerLoad] = useState<number>(7);

    // Capacity tracking state
    const [capacityInfo, setCapacityInfo] = useState<{
        remaining: number;
        scheduled: number;
        availableDates: Array<{ date: string; remaining: number }>;
    } | null>(null);
    const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);

    const [userRole, setUserRole] = useState<'admin' | 'employee'>('employee');

    // Add near other state declarations
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: ""
    });
    const [showAllDates, setShowAllDates] = useState(true); // Default to showing all

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionRes, ordersRes, itemsRes, catalogRes, settingsRes] = await Promise.all([
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/helpers/check_session.php", {
                        credentials: "include"
                    }),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_orders.php"),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_order_items.php"),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_items.php"),
                    fetch("http://localhost/laundry_tambayan_pos_system_backend/get_settings.php")
                ]);

                const sessionData = await sessionRes.json();
                if (sessionData.logged_in) {
                    setCurrentUserId(sessionData.user.id);
                    setUserRole(sessionData.user.type);
                }

                const ordersData = await ordersRes.json();
                const itemsData = await itemsRes.json();
                const catalogData = await catalogRes.json();
                const settingsData = await settingsRes.json();

                setOrders(ordersData);
                setOrderItems(itemsData);

                // Update overdue orders in database
                await updateOverdueOrders(ordersData);

                if (catalogData.success) {
                    setItems(catalogData.data);
                }

                // Process settings
                if (settingsData.success && settingsData.settings) {
                    const settingsObj: { [key: string]: string } = {};
                    settingsData.settings.forEach((s: any) => {
                        settingsObj[s.setting_name] = s.setting_value;
                    });

                    setSettings(settingsObj);

                    // Set load limit
                    if (settingsObj.load_limit) {
                        const limitNum = Number(settingsObj.load_limit);
                        if (!isNaN(limitNum)) setLoadLimit(limitNum);
                    }

                    // Set weight per load
                    if (settingsObj.weight_per_load) {
                        const weightNum = Number(settingsObj.weight_per_load);
                        if (!isNaN(weightNum) && weightNum > 0) setWeightPerLoad(weightNum);
                    }
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

    // Update overdue orders in the database
    const updateOverdueOrders = async (ordersToUpdate: Order[]) => {
        try {
            const updates = ordersToUpdate
                .filter(order => {
                    const calculatedStatus = calculateOrderStatus(order);
                    return order.order_status === "pending" && calculatedStatus !== "pending";
                })
                .map(order => ({
                    order_id: order.order_id,
                    order_status: calculateOrderStatus(order)
                }));

            if (updates.length === 0) return;

            const response = await fetch(
                "http://localhost/laundry_tambayan_pos_system_backend/update_order_status.php",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orders: updates })
                }
            );

            const result = await response.json();

            if (result.success) {
                console.log(`Updated ${updates.length} overdue order(s)`);

                // Update local state to reflect database changes
                setOrders(prev => prev.map(order => {
                    const update = updates.find(u => u.order_id === order.order_id);
                    if (update) {
                        return { ...order, order_status: update.order_status };
                    }
                    return order;
                }));
            }
        } catch (error) {
            console.error("Error updating overdue orders:", error);
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
    // Filter by search term AND date range (if admin)
    const filteredOrders = orders.filter((order) => {
        // Search filter
        const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.order_id.toString().includes(searchTerm.toLowerCase());

        // Date range filter (admin only)
        if (userRole === 'admin' && !showAllDates) {
            if (dateRange.startDate || dateRange.endDate) {
                const orderDate = new Date(order.created_at);
                orderDate.setHours(0, 0, 0, 0);

                if (dateRange.startDate && dateRange.endDate) {
                    const start = new Date(dateRange.startDate);
                    const end = new Date(dateRange.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);

                    return matchesSearch && orderDate >= start && orderDate <= end;
                } else if (dateRange.startDate) {
                    const start = new Date(dateRange.startDate);
                    start.setHours(0, 0, 0, 0);
                    return matchesSearch && orderDate >= start;
                } else if (dateRange.endDate) {
                    const end = new Date(dateRange.endDate);
                    end.setHours(23, 59, 59, 999);
                    return matchesSearch && orderDate <= end;
                }
            }
        }

        return matchesSearch;
    });

    // Sort transactions
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "order_status") {
            aValue = calculateOrderStatus(a);
            bValue = calculateOrderStatus(b);
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

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
    const handleSort = (key: keyof Order | "order_status") => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Get sort indicator
    const getSortIndicator = (columnName: keyof Order | "order_status") => {
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
        // Delivery Fee is always a service
        if (itemName === "Delivery Fee") return 'service';

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
            quantity: Number(item.quantity) || 1
        }));

        // Store original item names for warning check
        const originalItemNames = items.map(item => item.service_name);

        // Use the snapshot from database and ensure it's a number
        const orderWeightPerLoad = Number(order.weight_per_load_snapshot) || 7;
        setOriginalWeightPerLoad(orderWeightPerLoad);

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
        setHasUserEditedWeight(false);
        setUseCurrentPrices(false);
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

        // Determine price based on user's choice
        let priceToUse: number;

        if (useCurrentPrices) {
            priceToUse = service.item_price;
        } else {
            const originalItem = selectedTransaction?.items.find(
                item => item.service_name === selectedService
            );
            priceToUse = originalItem ? Number(originalItem.price) : service.item_price;
        }

        // ✅ NEW: Use original or current weight per load based on price mode
        const perLoad = useCurrentPrices
            ? (weightPerLoad && !isNaN(weightPerLoad) && weightPerLoad > 0 ? weightPerLoad : 7)
            : originalWeightPerLoad;

        setEditForm(prev => ({
            ...prev,
            selectedItems: [...prev.selectedItems, {
                item_name: service.item_name,
                price: priceToUse,
                type: 'service',
                quantity: Number(prev.total_weight) ? Math.ceil(Number(prev.total_weight) / perLoad) : 0
            }]
        }));
        setSelectedService("");
    };

    /// Add addon to order
    const handleAddAddon = () => {
        if (!selectedAddon) return;

        const addon = addons.find(a => a.item_name === selectedAddon);
        if (!addon) return;

        // ✅ NEW: Determine price based on user's choice
        let priceToUse: number;

        if (useCurrentPrices) {
            // Use current catalog price
            priceToUse = addon.item_price;
        } else {
            // Check if this addon existed in the original order
            const originalItem = selectedTransaction?.items.find(
                item => item.service_name === selectedAddon
            );
            // Use original price if it existed, otherwise use current catalog price
            priceToUse = originalItem ? Number(originalItem.price) : addon.item_price;
        }

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
                    price: priceToUse,
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
        if (isEditMode && editForm.total_weight && hasUserEditedWeight) {
            const weight = Number(editForm.total_weight);

            // ✅ NEW: Use original or current weight per load based on price mode
            const perLoad = useCurrentPrices
                ? (weightPerLoad && !isNaN(weightPerLoad) && weightPerLoad > 0 ? weightPerLoad : 7)
                : originalWeightPerLoad;

            const loads = Math.ceil(weight / perLoad);

            setEditForm(prev => ({
                ...prev,
                selectedItems: prev.selectedItems.map(item =>
                    item.type === 'service' && item.item_name !== 'Delivery Fee'
                        ? { ...item, quantity: loads }
                        : item
                )
            }));
        }
    }, [editForm.total_weight, isEditMode, hasUserEditedWeight, useCurrentPrices, originalWeightPerLoad, weightPerLoad]);

    // Auto-add/remove delivery fee when schedule type changes in edit mode
    useEffect(() => {
        if (!isEditMode) return;

        // Get delivery fee from settings
        const feeValue = parseFloat(settings['delivery_fee'] ?? '50');
        const validFee = isNaN(feeValue) ? 50 : feeValue;

        // ✅ NEW: Determine delivery fee price based on user's choice
        let deliveryFeePrice: number;

        if (useCurrentPrices) {
            // Use current delivery fee from settings
            deliveryFeePrice = validFee;
        } else {
            // Check if delivery fee existed in original order
            const originalDeliveryFee = selectedTransaction?.items.find(
                item => item.service_name === "Delivery Fee"
            );
            // Use original price if it existed, otherwise use current settings
            deliveryFeePrice = originalDeliveryFee ? Number(originalDeliveryFee.price) : validFee;
        }

        const deliveryFee = {
            item_name: "Delivery Fee",
            price: deliveryFeePrice,
            type: 'service' as const,
            quantity: 1
        };

        if (editForm.schedule_type === "delivery") {
            // Add or update delivery fee
            setEditForm(prev => {
                const hasDeliveryFee = prev.selectedItems.some(item => item.item_name === "Delivery Fee");
                if (!hasDeliveryFee) {
                    return {
                        ...prev,
                        selectedItems: [...prev.selectedItems, deliveryFee]
                    };
                } else {
                    // Update existing delivery fee with new price if mode changed
                    return {
                        ...prev,
                        selectedItems: prev.selectedItems.map(item =>
                            item.item_name === "Delivery Fee"
                                ? { ...item, price: deliveryFeePrice }
                                : item
                        )
                    };
                }
            });
        } else {
            // Remove delivery fee when switching to pickup
            setEditForm(prev => ({
                ...prev,
                selectedItems: prev.selectedItems.filter(item => item.item_name !== "Delivery Fee")
            }));
        }
    }, [editForm.schedule_type, isEditMode, useCurrentPrices, settings, weightPerLoad, originalWeightPerLoad, selectedTransaction]);

    useEffect(() => {
        if (!isEditMode || !selectedTransaction) return;

        setEditForm(prev => ({
            ...prev,
            selectedItems: prev.selectedItems.map(item => {
                if (item.item_name === "Delivery Fee") return item;

                let newPrice: number;

                if (useCurrentPrices) {

                    const catalogItem = items.find(i => i.item_name === item.item_name);
                    newPrice = catalogItem ? catalogItem.item_price : item.price;
                } else {
                    // Find original price from transaction
                    const originalItem = selectedTransaction.items.find(
                        i => i.service_name === item.item_name
                    );
                    // If item wasn't in original order, keep current catalog price
                    newPrice = originalItem ? Number(originalItem.price) : item.price;
                }

                return { ...item, price: newPrice };
            })
        }));
    }, [useCurrentPrices, isEditMode]);

    // Calculate totals based on edit form
    const calculateEditTotals = () => {
        const weight = Number(editForm.total_weight) || 0;

        const perLoad = useCurrentPrices
            ? (weightPerLoad && !isNaN(weightPerLoad) && weightPerLoad > 0 ? weightPerLoad : 7)
            : originalWeightPerLoad;

        const loads = Math.ceil(weight / perLoad);
        const amount = editForm.selectedItems.reduce((sum, item) => {
            return sum + (Number(item.price) * item.quantity);
        }, 0);

        return { loads, amount };
    };

    // Check daily capacity when date is selected in edit mode
    const checkDailyCapacity = async (date: string) => {
        if (!date) return;

        setIsCheckingCapacity(true);
        try {
            const response = await fetch(
                `http://localhost/laundry_tambayan_pos_system_backend/check_daily_capacity.php?date=${date}`
            );

            if (!response.ok) {
                console.error("HTTP error:", response.status);
                setCapacityInfo(null);
                return;
            }

            const text = await response.text();

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error("Failed to parse JSON. Server response:", text);
                setCapacityInfo(null);
                return;
            }

            if (result.success) {
                setCapacityInfo({
                    remaining: result.remaining_capacity,
                    scheduled: result.scheduled_loads,
                    availableDates: result.available_dates
                });
            } else {
                console.error("API error:", result.message);
                setCapacityInfo(null);
            }
        } catch (error) {
            console.error("Error checking capacity:", error);
            setCapacityInfo(null);
        } finally {
            setIsCheckingCapacity(false);
        }
    };

    // Get minimum date (tomorrow)
    const getMinDate = (): string => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    // Check if date is Sunday
    const isSunday = (dateString: string): boolean => {
        const date = new Date(dateString + 'T00:00:00');
        return date.getDay() === 0;
    };

    // Validate date selection
    const validateDateSelection = (): string | null => {
        if (!editForm.schedule_date) return "Please select a schedule date.";

        if (selectedTransaction && editForm.schedule_date === selectedTransaction.order.schedule_date) {
            return null;
        }

        const selectedDate = new Date(editForm.schedule_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if past date
        if (selectedDate < today) {
            return "Cannot schedule for past dates.";
        }

        // Check if Sunday
        if (isSunday(editForm.schedule_date)) {
            return "Sundays are not available. Please select another date.";
        }

        // Check if tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (selectedDate < tomorrow) {
            return "Orders must be scheduled at least 1 day in advance.";
        }

        // Check capacity
        const { loads } = calculateEditTotals();
        if (capacityInfo && loads > capacityInfo.remaining) {
            let message = `This date only has ${capacityInfo.remaining}/${loadLimit} loads available (${capacityInfo.scheduled} scheduled). `;
            message += "Your order requires " + loads + " loads. ";

            if (capacityInfo.availableDates.length > 0) {
                message += "\n\nAvailable dates:\n";
                capacityInfo.availableDates.forEach(d => {
                    const dateObj = new Date(d.date + 'T00:00:00');
                    const formatted = dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    message += `• ${formatted} (${d.remaining} loads available)\n`;
                });
            }

            return message;
        }

        return null;
    };

    // Check capacity when schedule date changes in edit mode
    useEffect(() => {
        if (isEditMode && editForm.schedule_date) {
            const timer = setTimeout(() => {
                checkDailyCapacity(editForm.schedule_date);
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setCapacityInfo(null);
        }
    }, [editForm.schedule_date, isEditMode]);

    // Clean up capacity info when modal closes
    useEffect(() => {
        if (!showReceipt) {
            setCapacityInfo(null);
            setIsCheckingCapacity(false);
        }
    }, [showReceipt]);

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

        const dateError = validateDateSelection();
        if (dateError) {
            setModalConfig({
                show: true,
                title: "Invalid Schedule Date",
                message: dateError,
                type: "error",
                onConfirm: () => { }
            });
            return;
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
        const updatedOrderData: any = {
            order_id: orderId,
            total_weight: Number(editForm.total_weight),
            total_load: loads,
            total_amount: amount,
            customer_name: editForm.customer_name,
            contact: editForm.contact,
            address: editForm.address,
            schedule_type: editForm.schedule_type as 'pickup' | 'delivery',
            schedule_date: editForm.schedule_date
        };

        if (useCurrentPrices) {
            updatedOrderData.weight_per_load_snapshot = weightPerLoad;
        }

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
                setUseCurrentPrices(false);

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
        if (!selectedTransaction) return;

        const original = selectedTransaction.order;
        const originalItems = selectedTransaction.items;

        // Normalize and compare form fields
        const formFieldsChanged =
            editForm.customer_name.trim() !== original.customer_name.trim() ||
            Number(editForm.total_weight) !== Number(original.total_weight) ||
            editForm.schedule_type !== original.schedule_type ||
            editForm.schedule_date !== original.schedule_date ||
            (editForm.contact || '').trim() !== (original.contact || '').trim() ||
            (editForm.address || '').trim() !== (original.address || '').trim() ||
            editForm.password.trim() !== "";

        // Check if items count changed
        const itemsCountChanged = editForm.selectedItems.length !== originalItems.length;

        // Check individual items details by finding matching items
        let itemDetailsChanged = false;
        if (!itemsCountChanged) {
            // Check each current item against original
            for (const currentItem of editForm.selectedItems) {
                const origItem = originalItems.find(oi => oi.service_name === currentItem.item_name);

                if (!origItem) {
                    itemDetailsChanged = true;
                    break;
                }

                // Convert both to numbers for comparison
                if (Number(currentItem.quantity) !== Number(origItem.quantity || 1) ||
                    Number(currentItem.price) !== Number(origItem.price)) {
                    itemDetailsChanged = true;
                    break;
                }
            }
        }

        const hasChanges = formFieldsChanged || itemsCountChanged || itemDetailsChanged;

        if (hasChanges) {
            setModalConfig({
                show: true,
                title: "Cancel Changes",
                message: "Are you sure you want to cancel? All changes will be lost.",
                type: "confirm",
                onConfirm: () => {
                    setIsEditMode(false);
                    setCapacityInfo(null);
                    setUseCurrentPrices(false);
                    setModalConfig(prev => ({ ...prev, show: false }));
                }
            });
        } else {
            // No changes made, just close
            setIsEditMode(false);
            setCapacityInfo(null);
            setUseCurrentPrices(false);
        }
    };

    const { loads: editLoads, amount: editAmount } = isEditMode && selectedTransaction
        ? calculateEditTotals()
        : { loads: 0, amount: 0 };

    if (loading) {
        return (
            <div className="history-page">
                <SystemTitle />
                <div className="loading-message">Loading transactions...</div>
            </div>
        );
    }

    return (
        <div className="history-page">
            {userRole === 'admin' ? <AdminNavbar /> : <EmployeeNavbar />}
            <SystemTitle />

            <div className="history-container">
                <h2 className="history-title">Transaction History</h2>
                <div className="separator"></div>
                <h3 className="history-subtitle">All Transaction History</h3>
                <div className="filter-section">
                    {/* Admin-only date range filter */}
                    {userRole === 'admin' && (
                        <div className="date-filter-container">
                            <div className="date-inputs">
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, startDate: e.target.value });
                                        setShowAllDates(false);
                                    }}
                                    className="date-input"
                                    placeholder="Start Date"
                                />
                                <span style={{ margin: '0 10px', color: '#666' }}>to</span>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, endDate: e.target.value });
                                        setShowAllDates(false);
                                    }}
                                    className="date-input"
                                    placeholder="End Date"
                                />
                                <button
                                    onClick={() => {
                                        setDateRange({ startDate: "", endDate: "" });
                                        setShowAllDates(true);
                                    }}
                                    className="clear-filter-btn"
                                >
                                    Show All
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Existing search input */}
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
                                <th onClick={() => handleSort("order_status")}>
                                    Order Status <span>{getSortIndicator("order_status")}</span>
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
                                            <span className="receipt-label">Employee Name:</span>
                                            <span className="receipt-value">{selectedTransaction.order.employee_name || 'Unknown'}</span>
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
                                            <span className="receipt-label">Weight Per Load (used for calculation):</span>
                                            <span className="receipt-value">{Number(selectedTransaction.order.weight_per_load_snapshot).toFixed(2)} KG</span>
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
                                                        <td>{item.service_name === 'Delivery Fee' ? 'Service' : (getItemType(item.service_name) === 'service' ? 'Service' : 'Addon')}</td>
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

                                    {userRole === 'admin' && (
                                        <div className="edit-button-container" style={{ marginTop: '10px' }}>
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="delete-order-btn"
                                            >
                                                Delete Order
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
                                            <span className="receipt-label">Employee Name:</span>
                                            <span className="receipt-value">{selectedTransaction.order.employee_name || 'Unknown'}</span>
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
                                                min="0.1"
                                                step="0.1"
                                                value={editForm.total_weight}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) > 0)) {
                                                        setEditForm({ ...editForm, total_weight: value });
                                                        setHasUserEditedWeight(true);
                                                    }
                                                }}
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
                                                min={getMinDate()}
                                                className="edit-input"
                                            />

                                            {/* Loading indicator while checking capacity */}
                                            {isCheckingCapacity && (
                                                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#aaa' }}>
                                                    Checking availability...
                                                </div>
                                            )}

                                            {/* Capacity info display */}
                                            {capacityInfo && editForm.schedule_date && !isCheckingCapacity && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <small
                                                        style={{
                                                            color: (() => {
                                                                const greenThreshold = Math.ceil(loadLimit * 0.7);
                                                                const orangeThreshold = Math.ceil(loadLimit * 0.3);

                                                                if (capacityInfo.remaining > greenThreshold) return '#4caf50';
                                                                if (capacityInfo.remaining > orangeThreshold) return '#ff9800';
                                                                return '#f44336';
                                                            })(),
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {capacityInfo.remaining > 0
                                                            ? `${capacityInfo.remaining}/${loadLimit} loads available (${capacityInfo.scheduled} scheduled)`
                                                            : '⚠️ This date is fully booked'}
                                                    </small>
                                                </div>
                                            )}
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

                                        <div className="price-mode-selector">
                                            <div className="price-box-header">
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={useCurrentPrices}
                                                        onChange={(e) => setUseCurrentPrices(e.target.checked)}
                                                    />
                                                    <span className="custom-checkbox"></span>
                                                    Use Current Prices & Settings
                                                </label>

                                                <span className={`mode-badge ${useCurrentPrices ? 'current' : 'original'}`}>
                                                    {useCurrentPrices ? 'CURRENT' : 'ORIGINAL'}
                                                </span>
                                            </div>

                                            <p className="price-mode-description">
                                                {useCurrentPrices ? (
                                                    <>
                                                        <strong>Current Mode:</strong> Using latest prices, delivery fee (₱{settings['delivery_fee'] || '50'}),
                                                        and weight per load ({weightPerLoad}kg). Service quantities will be recalculated.
                                                    </>
                                                ) : (
                                                    <>
                                                        <strong>Original Mode:</strong> Using original prices (when order was created),
                                                        delivery fee, and weight calculation ({originalWeightPerLoad.toFixed(1)}kg per load).
                                                    </>
                                                )}
                                            </p>
                                        </div>

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
                                                                <td>
                                                                    {item.type === 'service' ? 'Service' : 'Addon'}
                                                                    {!useCurrentPrices && !editForm.originalItems.includes(item.item_name) && (
                                                                        <span style={{
                                                                            marginLeft: '4px',
                                                                            fontSize: '0.7rem',
                                                                            color: '#ff9800',
                                                                            fontWeight: 'bold'
                                                                        }} title="New item - using current price">
                                                                            *
                                                                        </span>
                                                                    )}
                                                                </td>
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
                onClose={() => {
                    setModalConfig({ ...modalConfig, show: false });
                }}
                onConfirm={() => {
                    if (modalConfig.onConfirm) {
                        modalConfig.onConfirm();
                    }
                    setModalConfig({ ...modalConfig, show: false });
                }}
            />
            < SettingsFooter />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedTransaction && (
                <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-confirm-header">
                            <h3>⚠️ Confirm Order Deletion</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeletePassword("");
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="delete-confirm-content">
                            <p className="warning-text">
                                You are about to permanently delete Order #{selectedTransaction.order.order_id}
                            </p>
                            <p className="warning-subtext">
                                Customer: <strong>{selectedTransaction.order.customer_name}</strong><br />
                                Amount: <strong>₱{Number(selectedTransaction.order.total_amount).toFixed(2)}</strong>
                            </p>
                            <p className="danger-notice">
                                ⚠️ This action cannot be undone!
                            </p>

                            <div className="delete-password-field">
                                <label>Enter your admin password to confirm:</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="delete-password-input"
                                    disabled={isDeleting}
                                />
                            </div>
                        </div>

                        <div className="delete-confirm-actions">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeletePassword("");
                                }}
                                className="cancel-delete-btn"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteOrder}
                                className="confirm-delete-btn"
                                disabled={isDeleting || !deletePassword}
                            >
                                {isDeleting ? "Deleting..." : "Delete Order"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;