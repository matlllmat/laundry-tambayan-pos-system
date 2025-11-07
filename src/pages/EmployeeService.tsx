import React, { useState, useEffect } from "react";
import "./EmployeeService.css";
import EmployeeNavbar from "../components/EmployeeNavbar";
import "../components/SystemTitle.css";
import CustomModal from "../components/Modals";
import SystemTitle from "../components/SystemTitle";

// Define service item interface
interface ServiceItem {
    name: string;
    price: number;
    type: 'service' | 'addon';
    quantity: number;
}

const ServicePage: React.FC = () => {
    const STORAGE_KEY = 'laundry_service_draft';

    const [modalConfig, setModalConfig] = useState({
        show: false,
        title: "",
        message: "",
        type: "info" as "info" | "confirm" | "error" | "success",
        onConfirm: () => { },
    });

    const [loadWeight, setLoadWeight] = useState("");
    const [numLoads, setNumLoads] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [contactNo, setContactNo] = useState("");
    const [address, setAddress] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [scheduleType, setScheduleType] = useState("pickup");

    const [services, setServices] = useState<{ name: string; price: number }[]>([]);
    const [addons, setAddons] = useState<{ name: string; price: number }[]>([]);

    // Service items state - stores selected services for adding and removing on the summary table
    const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

    // Current selections
    const [selectedMainService, setSelectedMainService] = useState("");
    const [selectedAddon, setSelectedAddon] = useState("");

    // Capacity tracking
    const [capacityInfo, setCapacityInfo] = useState<{
        remaining: number;
        scheduled: number;
        availableDates: Array<{ date: string; remaining: number }>;
    } | null>(null);
    const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);

    // Load draft from sessionStorage on component mount
    useEffect(() => {
        const loadDraft = () => {
            try {
                const savedDraft = sessionStorage.getItem(STORAGE_KEY);
                if (savedDraft) {
                    const draft = JSON.parse(savedDraft);

                    // Restore all form fields
                    setLoadWeight(draft.loadWeight || "");
                    setNumLoads(draft.numLoads || "");
                    setCustomerName(draft.customerName || "");
                    setContactNo(draft.contactNo || "");
                    setAddress(draft.address || "");
                    setPickupDate(draft.pickupDate || "");
                    setScheduleType(draft.scheduleType || "pickup");
                    setServiceItems(draft.serviceItems || []);
                    setSelectedMainService(draft.selectedMainService || "");
                    setSelectedAddon(draft.selectedAddon || "");

                    console.log("Draft loaded from session storage");
                }
            } catch (error) {
                console.error("Failed to load draft:", error);
            }
        };

        loadDraft();
    }, []);

    // Save draft to sessionStorage whenever form data changes
    useEffect(() => {
        const saveDraft = () => {
            try {
                const draft = {
                    loadWeight,
                    numLoads,
                    customerName,
                    contactNo,
                    address,
                    pickupDate,
                    scheduleType,
                    serviceItems,
                    selectedMainService,
                    selectedAddon,
                    savedAt: new Date().toISOString()
                };

                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
            } catch (error) {
                console.error("Failed to save draft:", error);
            }
        };

        // Only save if there's actual data
        if (loadWeight || customerName || serviceItems.length > 0) {
            saveDraft();
        }
    }, [loadWeight, numLoads, customerName, contactNo, address, pickupDate, scheduleType, serviceItems, selectedMainService, selectedAddon]);

    // Auto-calculate number of loads based on weight
    useEffect(() => {
        if (loadWeight && !isNaN(Number(loadWeight))) {
            const weight = Number(loadWeight);
            const calculatedLoads = Math.ceil(weight / 7);
            setNumLoads(calculatedLoads.toString());
        } else {
            setNumLoads("");
        }
    }, [loadWeight]);

    // Auto-add/remove delivery fee when schedule type changes
    useEffect(() => {
        const deliveryFee = {
            name: "Delivery Fee",
            price: 50,
            type: 'service' as const,
            quantity: 1
        };

        if (scheduleType === "delivery") {
            // Add delivery fee if not already present
            setServiceItems(prev => {
                const hasDeliveryFee = prev.some(item => item.name === "Delivery Fee");
                if (!hasDeliveryFee) {
                    return [...prev, deliveryFee];
                }
                return prev;
            });
        } else {
            // Remove delivery fee when switching to pickup
            setServiceItems(prev => prev.filter(item => item.name !== "Delivery Fee"));
        }
    }, [scheduleType]);

    // Add service to the list
    const handleAddService = (serviceName: string, type: 'service' | 'addon') => {
        setServiceItems(prev => {
            if (type === 'service') {
                // Services can only be added once
                const exists = prev.some(item => item.name === serviceName);
                if (!exists) {
                    return [...prev, {
                        name: serviceName,
                        price: getPrice(serviceName),
                        type: 'service',
                        quantity: Number(numLoads) || 0
                    }];
                }
            } else {
                // Check if addon already exists
                const existingAddon = prev.find(item => item.name === serviceName && item.type === 'addon');
                if (existingAddon) {
                    // If exists, increment its quantity instead
                    return prev.map(item =>
                        item.name === serviceName && item.type === 'addon'
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                } else {
                    // If doesn't exist, add new addon with quantity 1
                    return [...prev, {
                        name: serviceName,
                        price: getPrice(serviceName),
                        type: 'addon',
                        quantity: 1
                    }];
                }
            }
            return prev;
        });

        // Reset dropdowns
        setSelectedMainService("");
        setSelectedAddon("");
    };

    // Remove service from the list (instant removal)
    const handleRemoveService = (serviceName: string) => {
        setServiceItems(prev => prev.filter(item => item.name !== serviceName));
    };

    // Increment addon quantity
    const handleIncrementAddon = (serviceName: string) => {
        setServiceItems(prev => prev.map(item =>
            item.name === serviceName && item.type === 'addon'
                ? { ...item, quantity: item.quantity + 1 }
                : item
        ));
    };

    // Decrement addon quantity (remove if reaches 0)
    const handleDecrementAddon = (serviceName: string) => {
        setServiceItems(prev => prev
            .map(item =>
                item.name === serviceName && item.type === 'addon'
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            )
            .filter(item => item.type === 'service' || item.quantity > 0)
        );
    };

    // Update service quantities when numLoads changes
    useEffect(() => {
        if (numLoads && !isNaN(Number(numLoads))) {
            setServiceItems(prev => prev.map(item =>
                item.type === 'service'
                    ? { ...item, quantity: Number(numLoads) }
                    : item
            ));
        } else {
            setServiceItems(prev => prev.map(item =>
                item.type === 'service'
                    ? { ...item, quantity: 0 }
                    : item
            ));
        }
    }, [numLoads]);

    // Check if a service is already added
    const isServiceAdded = (serviceName: string): boolean => {
        return serviceItems.some(item => item.name === serviceName && item.type === 'service');
    };

    // Check daily capacity when date is selected
    const checkDailyCapacity = async (date: string) => {
        if (!date) return;

        setIsCheckingCapacity(true);
        try {
            const response = await fetch(
                `http://localhost/laundry_tambayan_pos_system_backend/check_daily_capacity.php?date=${date}`
            );

            // Check if response is ok
            if (!response.ok) {
                console.error("HTTP error:", response.status);
                setCapacityInfo(null);
                return;
            }

            const text = await response.text();

            // Try to parse as JSON
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

    // Check capacity when date changes (with debounce to prevent blinking)
    useEffect(() => {
        if (pickupDate) {
            // Small delay to prevent excessive calls
            const timer = setTimeout(() => {
                checkDailyCapacity(pickupDate);
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setCapacityInfo(null);
        }
    }, [pickupDate]);

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
        if (!pickupDate) return "Please select a schedule date.";

        const selectedDate = new Date(pickupDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if past date
        if (selectedDate < today) {
            return "Cannot schedule for past dates.";
        }

        // Check if Sunday
        if (isSunday(pickupDate)) {
            return "Sundays are not available. Please select another date.";
        }

        // Check if tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (selectedDate < tomorrow) {
            return "Orders must be scheduled at least 1 day in advance.";
        }

        // Check capacity
        if (capacityInfo && Number(numLoads) > capacityInfo.remaining) {
            let message = `This date only has ${capacityInfo.remaining} loads available (${capacityInfo.scheduled}/30 scheduled). `;
            message += "Your order requires " + numLoads + " loads. ";

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

    // Validate phone number (11 digits starting with 09)
    const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(phone);
    };

    // Calculate total based on items
    const calculateTotal = (): number => {
        return serviceItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
    };
    const total = calculateTotal();

    // Handle confirm order with validation
    const handleConfirmOrder = () => {
        // Basic required fields
        if (!customerName || !pickupDate || !loadWeight) {
            setModalConfig({
                show: true,
                title: "Invalid Input",
                message: "Please fill out all required fields (Customer Name, Schedule, Load Weight).",
                type: "error",
                onConfirm: () => { },
            });
            return;
        }

        // Check if at least one service is selected
        if (serviceItems.length === 0) {
            setModalConfig({
                show: true,
                title: "No Services Selected",
                message: "Please select at least one service before confirming.",
                type: "error",
                onConfirm: () => { },
            });
            return;
        }

        // Check if at least one REAL service from items table exists (not just Delivery Fee)
        const hasRealService = serviceItems.some(
            item => item.type === 'service' && item.name !== "Delivery Fee"
        );

        if (!hasRealService) {
            setModalConfig({
                show: true,
                title: "No Service Selected",
                message: "Please select at least one service (Wash Only, Wash and Dry, etc.) before confirming. Addons and delivery fee alone are not sufficient.",
                type: "error",
                onConfirm: () => { },
            });
            return;
        }

        // Validate date selection and capacity
        const dateError = validateDateSelection();
        if (dateError) {
            setModalConfig({
                show: true,
                title: "Invalid Schedule Date",
                message: dateError,
                type: "error",
                onConfirm: () => { },
            });
            return;
        }

        // Additional validation for delivery
        if (scheduleType === "delivery") {
            if (!contactNo || !address) {
                setModalConfig({
                    show: true,
                    title: "Invalid Input",
                    message: "Contact Number and Address are required for delivery orders.",
                    type: "error",
                    onConfirm: () => { },
                });
                return;
            }

            if (!validatePhone(contactNo)) {
                setModalConfig({
                    show: true,
                    title: "Invalid Phone Number",
                    message: "Contact number must be 11 digits starting with 09 (e.g., 09171234567).",
                    type: "error",
                    onConfirm: () => { },
                });
                return;
            }
        }

        // All validation passed, show confirmation
        setModalConfig({
            show: true,
            title: "Confirm Order",
            message: "Are you sure you want to confirm this order?",
            type: "confirm",
            onConfirm: () => {
                saveOrder();
                setModalConfig({ ...modalConfig, show: false });
            },
        });
    };

    // Clear all fields
    const handleClear = () => {
        setLoadWeight("");
        setNumLoads("");
        setCustomerName("");
        setContactNo("");
        setAddress("");
        setPickupDate("");
        setScheduleType("pickup");
        setServiceItems([]);
        setSelectedMainService("");
        setSelectedAddon("");
        setModalConfig({ ...modalConfig, show: false });

        // Clear sessionStorage
        sessionStorage.removeItem(STORAGE_KEY);
        console.log("Draft cleared from session storage");
    };

    // items list getter
    const getPrice = (serviceName: string): number => {
        const item = [...services, ...addons].find(i => i.name === serviceName);
        return item ? item.price : 0;
    };

    //items getter
    useEffect(() => {
        fetch("http://localhost/laundry_tambayan_pos_system_backend/get_items.php")
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    const fetchedServices = data.data.filter((item: any) => item.item_type === "service");
                    const fetchedAddons = data.data.filter((item: any) => item.item_type === "addon");

                    setServices(fetchedServices.map((item: any) => ({
                        name: item.item_name,
                        price: parseFloat(item.item_price),
                    })));

                    setAddons(fetchedAddons.map((item: any) => ({
                        name: item.item_name,
                        price: parseFloat(item.item_price),
                    })));
                } else {
                    console.error("Failed to load items:", data.message);
                }
            })
            .catch((err) => console.error("Error fetching items:", err));
    }, []);

    // Save order to the database
    const saveOrder = async () => {
        const currentTimestamp = new Date().toISOString();

        const newOrder = {
            employee_id: 1,
            total_weight: Number(loadWeight),
            total_load: Number(numLoads),
            total_amount: total,
            customer_name: customerName,
            contact: contactNo,
            address: address,
            schedule_type: scheduleType,
            schedule_date: pickupDate,
            created_at: currentTimestamp,
            order_status: "pending",
            order_items: serviceItems.map(item => ({
                service_name: item.name,
                price: item.price,
                quantity: item.quantity,
                calculated_amount: item.price * item.quantity,
            })),
        };

        try {
            const response = await fetch("http://localhost/laundry_tambayan_pos_system_backend/create_order.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newOrder),
            });

            const result = await response.json();

            if (result.success) {
                setModalConfig({
                    show: true,
                    title: "Order Confirmed",
                    message: `Order #${result.order_id} created successfully!`,
                    type: "success",
                    onConfirm: () => {
                        handleClear(); // This will also clear sessionStorage
                    },
                });
            } else {
                setModalConfig({
                    show: true,
                    title: "Error",
                    message: result.message || "Failed to create order.",
                    type: "error",
                    onConfirm: () => { },
                });
            }
        } catch (error) {
            setModalConfig({
                show: true,
                title: "Error",
                message: "Network or server error occurred.",
                type: "error",
                onConfirm: () => { },
            });
        }
    };

    return (
        <div className="service-page">
            <EmployeeNavbar />
            <SystemTitle />

            <div className="service-container">
                <div className="service-header">
                    <h1>Service</h1>
                </div>
                <div className="service-card">
                    {/* Summary Table */}
                    <div className="summary-section">
                        <h4 className="section-title">Summary:</h4>
                        <div className="summary-table">
                            <table>
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
                                    {serviceItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                                                No services added yet
                                            </td>
                                        </tr>
                                    ) : (
                                        serviceItems.map((item, index) => (
                                            <tr key={index}>
                                                <td style={{ textAlign: 'left' }}>{item.name}</td>
                                                <td>{item.type === 'service' ? 'Service' : 'Addon'}</td>
                                                <td>₱{item.price.toFixed(2)}</td>
                                                <td>{item.quantity}</td>
                                                <td>₱{(item.price * item.quantity).toFixed(2)}</td>
                                                <td>
                                                    {item.type === 'service' ? (
                                                        item.name === "Delivery Fee" ? (
                                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>Auto</span>
                                                        ) : (
                                                            <button
                                                                className="action-btn remove-btn"
                                                                onClick={() => handleRemoveService(item.name)}
                                                                title="Remove"
                                                            >
                                                                ✕
                                                            </button>
                                                        )
                                                    ) : (
                                                        <div className="addon-controls">
                                                            <button
                                                                className="action-btn decrement-btn"
                                                                onClick={() => handleDecrementAddon(item.name)}
                                                                title="Decrease"
                                                            >
                                                                -
                                                            </button>
                                                            <button
                                                                className="action-btn increment-btn"
                                                                onClick={() => handleIncrementAddon(item.name)}
                                                                title="Increase"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                        <td style={{ fontWeight: 'bold', textAlign: 'center' }}>₱{total.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="order-section">
                        <div className="input-group">
                            <label>Load Weight (KG):</label>
                            <input
                                type="number"
                                min="0"
                                value={loadWeight}
                                onChange={(e) => setLoadWeight(e.target.value)}
                            />

                        </div>

                        <div className="input-group">
                            <label>Number of Loads:</label>
                            <input
                                type="text"
                                value={numLoads}
                                readOnly
                                disabled
                                style={{ cursor: 'not-allowed', opacity: 0.7 }}
                            />
                        </div>

                        <div className="service-type">
                            <label>Service type:</label>
                            <div className="service-row">
                                <select
                                    value={selectedMainService}
                                    onChange={(e) => setSelectedMainService(e.target.value)}
                                >
                                    <option value="">Select a Service</option>
                                    {services.length === 0 ? (
                                        <option disabled>Loading...</option>
                                    ) : (
                                        services.map((service, index) => (
                                            <option key={index} value={service.name}>
                                                {service.name}
                                            </option>
                                        ))
                                    )}
                                </select>

                                <div className="quantity-btns">
                                    <button
                                        onClick={() => handleAddService(selectedMainService, 'service')}
                                        disabled={
                                            !selectedMainService || selectedMainService === "" || isServiceAdded(selectedMainService)
                                        }
                                        style={{
                                            opacity:
                                                !selectedMainService || selectedMainService === "" || isServiceAdded(selectedMainService)
                                                    ? 0.5
                                                    : 1,
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="service-row">
                                <select
                                    value={selectedAddon}
                                    onChange={(e) => setSelectedAddon(e.target.value)}
                                >
                                    <option value="">Select an Add-on</option>
                                    {addons.length === 0 ? (
                                        <option disabled>Loading...</option>
                                    ) : (
                                        addons.map((addon, index) => (
                                            <option key={index} value={addon.name}>
                                                {addon.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <div className="quantity-btns">
                                    <button
                                        onClick={() => handleAddService(selectedAddon, 'addon')}
                                        disabled={!selectedAddon || selectedAddon === ""}
                                        style={{
                                            opacity: !selectedAddon || selectedAddon === "" ? 0.5 : 1,
                                        }}
                                    >
                                        +
                                    </button>

                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Schedule:</label>
                            <input
                                type="date"
                                value={pickupDate}
                                onChange={(e) => setPickupDate(e.target.value)}
                                min={getMinDate()}
                                className="date-picker"
                            />
                            {isCheckingCapacity && (
                                <div className="capacity-indicator capacity-loading">
                                    <small style={{ color: '#aaa' }}>
                                        Checking availability...
                                    </small>
                                </div>
                            )}
                            {capacityInfo && pickupDate && !isCheckingCapacity && (
                                <div className="capacity-indicator">
                                    <small
                                        style={{
                                            color: capacityInfo.remaining > 20
                                                ? '#4caf50'
                                                : capacityInfo.remaining > 10
                                                    ? '#ff9800'
                                                    : '#f44336',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {capacityInfo.remaining > 0
                                            ? `${capacityInfo.remaining}/30 loads available (${capacityInfo.scheduled} scheduled)`
                                            : '⚠️ This date is fully booked'}
                                    </small>
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label>Schedule Type:</label>
                            <div className="service-row">
                                <select
                                    value={scheduleType}
                                    onChange={(e) => setScheduleType(e.target.value)}
                                >
                                    <option value="pickup">Pickup</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Customer Name:</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label>
                                Contact No.{scheduleType === "delivery" && <span style={{ color: '#ff6b6b' }}> *</span>}:
                            </label>
                            <input
                                type="text"
                                value={contactNo}
                                onChange={(e) => {
                                    // Only allow numbers
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 11) {
                                        setContactNo(value);
                                    }
                                }}
                                placeholder="09171234567"
                                maxLength={11}
                            />
                        </div>

                        <div className="input-group">
                            <label>
                                Address{scheduleType === "delivery" && <span style={{ color: '#ff6b6b' }}> *</span>}:
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Complete address"
                            />
                        </div>

                        <div className="button-group">
                            <button
                                className="confirm-btn"
                                type="button"
                                onClick={handleConfirmOrder}
                                disabled={serviceItems.length === 0}
                                style={{ opacity: serviceItems.length === 0 ? 0.6 : 1 }}
                            >
                                Confirm Order
                            </button>
                            <button
                                className="clear-btn"
                                type="button"
                                onClick={() =>
                                    setModalConfig({
                                        show: true,
                                        title: "Clear Order",
                                        message: "Are you sure you want to clear all fields?",
                                        type: "confirm",
                                        onConfirm: handleClear,
                                    })
                                }
                            >
                                Clear
                            </button>
                        </div>
                        <CustomModal
                            show={modalConfig.show}
                            title={modalConfig.title}
                            message={modalConfig.message}
                            type={modalConfig.type}
                            onClose={() => {
                                // If it's a success modal, clear data when closing
                                if (modalConfig.type === "success") {
                                    console.log("=== SUCCESS MODAL CLOSED - CLEARING DATA ===");
                                    handleClear();
                                } else {
                                    setModalConfig({ ...modalConfig, show: false });
                                }
                            }}
                            onConfirm={modalConfig.onConfirm}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServicePage;