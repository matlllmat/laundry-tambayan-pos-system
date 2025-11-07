import React, { useState, useMemo, useEffect } from "react";
import "./EmployeeScheduling.css";
import EmployeeNavbar from "../components/EmployeeNavbar";
import SystemTitle from "../components/SystemTitle";
import CustomModal from "../components/Modals";

export type ScheduleStatus = "Pending" | "Completed" | "Unclaimed" | "Late";

export interface ServiceItem {
    name: string;
    qty: number;
    price: number;
    subtotal: number;
}

export interface Schedule {
    scheduleId: string;
    orderNumber: string;
    customerName: string;
    contact: string;
    address: string;
    loadWeight: string;
    numLoads: string;
    transactionDate: string;
    scheduleType: "pickup" | "delivery";
    date: string;
    status: ScheduleStatus;
    notes: string;
    serviceItems: ServiceItem[];
    total: number;
}

export type TimeRange = "day" | "week" | "month" | "year" | "all";

export interface ScheduleStats {
    pending: number;
    completed: number;
    unclaimed: number;
    late: number;
}

interface EditScheduleModalProps {
    schedule: Schedule;
    onClose: () => void;
    onSave: (updatedSchedule: Partial<Schedule>) => Promise<void>;
}

const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
    schedule,
    onClose,
    onSave
}) => {
    const [originalSchedule] = useState({
        customerName: schedule.customerName,
        contact: schedule.contact,
        address: schedule.address,
        date: schedule.date,
        status: schedule.status
    });
    const [editedSchedule, setEditedSchedule] = useState({
        customerName: schedule.customerName,
        contact: schedule.contact,
        address: schedule.address,
        date: schedule.date,
        status: schedule.status
    });
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [password, setPassword] = useState("");
    const [saving, setSaving] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: "",
        message: "",
        onConfirm: () => { },
        confirmText: "Yes",
        type: "confirm" as "info" | "confirm" | "error" | "success"
    });

    const hasChanges = () => {
        return editedSchedule.customerName !== schedule.customerName ||
            editedSchedule.contact !== schedule.contact ||
            editedSchedule.address !== schedule.address ||
            editedSchedule.date !== schedule.date ||
            editedSchedule.status !== schedule.status;
    };

    const handleResetChanges = () => {
        setConfirmModalConfig({
            title: "Reset All Changes",
            message: "Are you sure you want to reset all changes? This will revert all fields including status back to their original values.",
            onConfirm: () => {
                setEditedSchedule(originalSchedule);
                setPassword("");
                setShowConfirmModal(false);
            },
            confirmText: "Yes, Reset All",
            type: "confirm"
        });
        setShowConfirmModal(true);
    };

    const handleRevertStatus = () => {
        setConfirmModalConfig({
            title: "Revert Status",
            message: "Are you sure you want to revert the status back to its original state?",
            onConfirm: () => {
                setEditedSchedule({ ...editedSchedule, status: originalSchedule.status });
                setShowConfirmModal(false);
            },
            confirmText: "Yes, Revert",
            type: "confirm"
        });
        setShowConfirmModal(true);
    };

    const handleDateChange = (newDate: string) => {
        if (newDate !== schedule.date) {
            setConfirmModalConfig({
                title: "Confirm Date Change",
                message: `Are you sure you want to change the schedule date from ${new Date(schedule.date).toLocaleDateString()} to ${new Date(newDate).toLocaleDateString()}?`,
                onConfirm: () => {
                    setEditedSchedule({ ...editedSchedule, date: newDate });
                    setShowConfirmModal(false);
                },
                confirmText: "Yes, Change Date",
                type: "confirm"
            });
            setShowConfirmModal(true);
        }
    };

    const handleMarkComplete = () => {
        setConfirmModalConfig({
            title: "Confirm Mark as Complete",
            message: "This will mark the schedule as completed. Changes will be saved when you click the Save button and enter your password.",
            onConfirm: () => {
                setEditedSchedule({ ...editedSchedule, status: "Completed" });
                setShowConfirmModal(false);
            },
            confirmText: "Yes, Mark Complete",
            type: "confirm"
        });
        setShowConfirmModal(true);
    };

    const isCompletedInDB = schedule.status === "Completed";
    const isCurrentlyMarkedComplete = editedSchedule.status === "Completed";

    const verifyPassword = async (): Promise<boolean> => {
        try {
            const response = await fetch('http://localhost/laundry_tambayan_pos_system_backend/verify_employee_password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ password })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error("Error verifying password:", error);
            return false;
        }
    };

    const handleSave = async () => {
        if (!hasChanges()) {
            setConfirmModalConfig({
                title: "No Changes",
                message: "No changes have been made to save.",
                onConfirm: () => setShowConfirmModal(false),
                confirmText: "OK",
                type: "info"
            });
            setShowConfirmModal(true);
            return;
        }

        if (!password.trim()) {
            setConfirmModalConfig({
                title: "Password Required",
                message: "Please enter your password to save changes.",
                onConfirm: () => setShowConfirmModal(false),
                confirmText: "OK",
                type: "error"
            });
            setShowConfirmModal(true);
            return;
        }

        try {
            setSaving(true);

            const isPasswordValid = await verifyPassword();

            if (!isPasswordValid) {
                setConfirmModalConfig({
                    title: "Incorrect Password",
                    message: "The password you entered is incorrect. Please try again.",
                    onConfirm: () => setShowConfirmModal(false),
                    confirmText: "OK",
                    type: "error"
                });
                setShowConfirmModal(true);
                setPassword("");
                setSaving(false);
                return;
            }

            const updates: Partial<Schedule> & { password?: string } = {};

            if (editedSchedule.customerName !== schedule.customerName)
                updates.customerName = editedSchedule.customerName;
            if (editedSchedule.contact !== schedule.contact)
                updates.contact = editedSchedule.contact;
            if (editedSchedule.address !== schedule.address)
                updates.address = editedSchedule.address;
            if (editedSchedule.date !== schedule.date)
                updates.date = editedSchedule.date;
            if (editedSchedule.status !== schedule.status)
                updates.status = editedSchedule.status;

            updates.scheduleId = schedule.scheduleId;
            updates.password = password;

            await onSave(updates);

            setConfirmModalConfig({
                title: "Success",
                message: "Schedule updated successfully!",
                onConfirm: () => {
                    setShowConfirmModal(false);
                    setTimeout(() => {
                        onClose();
                    }, 100);
                },
                confirmText: "OK",
                type: "success"
            });
            setShowConfirmModal(true);
            setPassword("");
        } catch (error) {
            console.error("Error saving schedule:", error);
            setConfirmModalConfig({
                title: "Error",
                message: "Failed to save changes. Please try again.",
                onConfirm: () => setShowConfirmModal(false),
                confirmText: "OK",
                type: "error"
            });
            setShowConfirmModal(true);
        } finally {
            setSaving(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <>
            <div className="modal-overlay" onClick={handleOverlayClick}>
                <div className="receipt-modal">
                    <div className="receipt-header">
                        <h2 className="receipt-title">{isCompletedInDB ? "View Schedule" : "Edit Schedule"}</h2>
                        <button onClick={onClose} className="receipt-close-btn">×</button>
                    </div>

                    <div className="receipt-body">
                        <div className="receipt-section">
                            <h3 className="receipt-section-title">Schedule Information</h3>
                            <div className="receipt-section-content">
                                <div className="receipt-row">
                                    <span className="receipt-label">Order ID:</span>
                                    <span className="receipt-value">{schedule.scheduleId}</span>
                                </div>
                                <div className="receipt-row">
                                    <span className="receipt-label">Order Number:</span>
                                    <span className="receipt-value">{schedule.orderNumber}</span>
                                </div>
                                <div className="receipt-row">
                                    <span className="receipt-label">Transaction Date:</span>
                                    <span className="receipt-value">
                                        {new Date(schedule.transactionDate).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true
                                        })}
                                    </span>
                                </div>
                                <div className="receipt-row">
                                    <span className="receipt-label">Schedule Type:</span>
                                    <span className="receipt-value schedule-type-badge">
                                        {schedule.scheduleType.toUpperCase()}
                                    </span>
                                </div>
                                <div className="receipt-row">
                                    <span className="receipt-label">Order Status:</span>
                                    <span className={`receipt-status-badge status-${editedSchedule.status.toLowerCase()}`}>
                                        {editedSchedule.status.toUpperCase()}
                                    </span>
                                </div>
                                {!isCompletedInDB && (
                                    <div className="receipt-row">
                                        {!isCurrentlyMarkedComplete ? (
                                            <button
                                                onClick={handleMarkComplete}
                                                className="btn-mark-complete-small"
                                                type="button"
                                            >
                                                ✓ Mark as Complete
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleRevertStatus}
                                                className="btn-completed-revert"
                                                type="button"
                                            >
                                                ✓ Completed (Click to Revert)
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="receipt-section">
                            <h3 className="receipt-section-title">Customer Information</h3>
                            <div className="receipt-section-content">
                                {isCompletedInDB ? (
                                    <>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Customer Name:</span>
                                            <span className="receipt-value">{schedule.customerName}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Contact:</span>
                                            <span className="receipt-value">{schedule.contact}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Address:</span>
                                            <span className="receipt-value">{schedule.address}</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Schedule Date:</span>
                                            <span className="receipt-value">
                                                {new Date(schedule.date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="receipt-row-editable">
                                            <label className="receipt-label">Customer Name:</label>
                                            <input
                                                type="text"
                                                value={editedSchedule.customerName}
                                                onChange={(e) => setEditedSchedule({ ...editedSchedule, customerName: e.target.value })}
                                                className="receipt-input"
                                            />
                                        </div>
                                        <div className="receipt-row-editable">
                                            <label className="receipt-label">Contact:</label>
                                            <input
                                                type="text"
                                                value={editedSchedule.contact}
                                                onChange={(e) => setEditedSchedule({ ...editedSchedule, contact: e.target.value })}
                                                className="receipt-input"
                                            />
                                        </div>
                                        <div className="receipt-row-editable">
                                            <label className="receipt-label">Address:</label>
                                            <textarea
                                                value={editedSchedule.address}
                                                onChange={(e) => setEditedSchedule({ ...editedSchedule, address: e.target.value })}
                                                className="receipt-textarea"
                                                rows={2}
                                            />
                                        </div>
                                        <div className="receipt-row-editable">
                                            <label className="receipt-label">Schedule Date:</label>
                                            <input
                                                type="date"
                                                value={editedSchedule.date}
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                className="receipt-input"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {schedule.serviceItems.length > 0 && (
                            <div className="receipt-section">
                                <h3
                                    className="receipt-section-title collapsible"
                                    onClick={() => setShowOrderDetails(!showOrderDetails)}
                                >
                                    Service Details
                                    <span className="toggle-icon">{showOrderDetails ? "▲" : "▼"}</span>
                                </h3>
                                {showOrderDetails && (
                                    <div className="receipt-section-content">
                                        <div className="receipt-row">
                                            <span className="receipt-label">Load Weight:</span>
                                            <span className="receipt-value">{schedule.loadWeight} KG</span>
                                        </div>
                                        <div className="receipt-row">
                                            <span className="receipt-label">Number of Loads:</span>
                                            <span className="receipt-value">{schedule.numLoads}</span>
                                        </div>

                                        {schedule.serviceItems.length > 0 && (
                                            <>
                                                <div className="receipt-row" style={{ borderTop: '2px solid #e9ecef', marginTop: '15px', paddingTop: '15px' }}>
                                                    <span className="receipt-label" style={{ fontSize: '15px', fontWeight: '700' }}>Service Items:</span>
                                                </div>
                                                <table className="receipt-table">
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
                                                        {schedule.serviceItems.map((item, index) => (
                                                            <tr key={index}>
                                                                <td>{item.name}</td>
                                                                <td>Service</td>
                                                                <td>₱{item.price.toFixed(2)}</td>
                                                                <td>{item.qty}</td>
                                                                <td>₱{item.subtotal.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="receipt-row receipt-total">
                                                    <span className="receipt-label">Total Amount:</span>
                                                    <span className="receipt-value-total">₱{schedule.total.toFixed(2)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {!isCompletedInDB && (
                            <div className="receipt-section">
                                <h3 className="receipt-section-title">Authentication</h3>
                                <div className="receipt-section-content">
                                    <div className="receipt-row-editable">
                                        <label className="receipt-label">Enter your password to save changes:</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="receipt-input"
                                            placeholder="Enter password"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isCompletedInDB ? (
                            <div className="receipt-actions">
                                <button
                                    onClick={handleResetChanges}
                                    className="receipt-btn receipt-btn-reset"
                                    disabled={!hasChanges() || saving}
                                    title="Reset all changes to original values"
                                >
                                    Reset Changes
                                </button>
                                <button
                                    onClick={onClose}
                                    className="receipt-btn receipt-btn-cancel"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="receipt-btn receipt-btn-save"
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        ) : (
                            <div className="receipt-actions">
                                <button
                                    onClick={onClose}
                                    className="receipt-btn receipt-btn-close-only"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CustomModal
                show={showConfirmModal}
                title={confirmModalConfig.title}
                message={confirmModalConfig.message}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmModalConfig.onConfirm}
                confirmText={confirmModalConfig.confirmText}
                type={confirmModalConfig.type}
            />
        </>
    );
};

interface ScheduleListModalProps {
    date: string;
    schedules: Schedule[];
    onClose: () => void;
    onSelectSchedule: (schedule: Schedule) => void;
}

const ScheduleListModal: React.FC<ScheduleListModalProps> = ({
    date,
    schedules,
    onClose,
    onSelectSchedule
}) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case "Pending":
                return "status-pending";
            case "Completed":
                return "status-completed";
            case "Unclaimed":
                return "status-unclaimed";
            case "Late":
                return "status-late";
            default:
                return "";
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="schedule-list-modal">
                <h2 className="list-modal-title">Schedules for {formatDate(date)}</h2>

                <div className="schedule-list">
                    {schedules.map((schedule) => (
                        <div
                            key={schedule.scheduleId}
                            className="schedule-item"
                            onClick={() => onSelectSchedule(schedule)}
                        >
                            <div className="schedule-item-header">
                                <span className="order-number">{schedule.orderNumber}</span>
                                <span className={`status-badge ${getStatusClass(schedule.status)}`}>
                                    {schedule.status}
                                </span>
                            </div>
                            <div className="schedule-item-body">
                                <p className="customer-name">{schedule.customerName}</p>
                                <p className="schedule-type-label">
                                    {schedule.scheduleType === "pickup" ? "📦 Pickup" : "🚚 Delivery"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="list-modal-actions">
                    <button onClick={onClose} className="btn-close-list">Close</button>
                </div>
            </div>
        </div>
    );
};

const EmployeeScheduling: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isListModalOpen, setListModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [statsTimeRange, setStatsTimeRange] = useState<TimeRange>("month");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('http://localhost/laundry_tambayan_pos_system_backend/get_schedules.php', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                setSchedules(result.data);
            } else {
                setError(result.message || 'Failed to fetch schedules');
                console.error('Error fetching schedules:', result.message);
            }
        } catch (err) {
            setError('Failed to connect to server');
            console.error('Error fetching schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSchedule = async (updatedSchedule: Partial<Schedule>) => {
        try {
            const response = await fetch('http://localhost/laundry_tambayan_pos_system_backend/update_schedule.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(updatedSchedule)
            });

            const result = await response.json();

            if (result.success) {
                setSchedules(schedules.map(s =>
                    s.scheduleId === updatedSchedule.scheduleId
                        ? { ...s, ...updatedSchedule }
                        : s
                ));
            } else {
                throw new Error(result.message || 'Failed to update schedule');
            }
        } catch (error) {
            console.error('Error updating schedule:', error);
            throw error;
        }
    };

    const calculateStats = useMemo((): ScheduleStats => {
        const now = new Date();
        let filteredSchedules = schedules;

        switch (statsTimeRange) {
            case "day":
                const today = now.toISOString().split('T')[0];
                filteredSchedules = schedules.filter(s => s.date === today);
                break;
            case "week":
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                filteredSchedules = schedules.filter(s => new Date(s.date) >= weekAgo);
                break;
            case "month":
                filteredSchedules = schedules.filter(s => {
                    const scheduleDate = new Date(s.date);
                    return scheduleDate.getMonth() === now.getMonth() &&
                        scheduleDate.getFullYear() === now.getFullYear();
                });
                break;
            case "year":
                filteredSchedules = schedules.filter(s => {
                    const scheduleDate = new Date(s.date);
                    return scheduleDate.getFullYear() === now.getFullYear();
                });
                break;
            case "all":
                filteredSchedules = schedules;
                break;
        }

        return {
            pending: filteredSchedules.filter(s => s.status === "Pending").length,
            completed: filteredSchedules.filter(s => s.status === "Completed").length,
            unclaimed: filteredSchedules.filter(s => s.status === "Unclaimed").length,
            late: filteredSchedules.filter(s => s.status === "Late").length
        };
    }, [schedules, statsTimeRange]);

    const getSchedulesForDate = (date: string): Schedule[] => {
        return schedules.filter(schedule => schedule.date === date);
    };

    const getScheduleCount = (date: string): number => {
        return schedules.filter(schedule => schedule.date === date).length;
    };

    const getDatePriorityColor = (date: string): string => {
        const dateSchedules = getSchedulesForDate(date);
        if (dateSchedules.length === 0) return "";

        if (dateSchedules.some(s => s.status === "Late")) return "priority-late";
        if (dateSchedules.some(s => s.status === "Pending")) return "priority-pending";
        if (dateSchedules.some(s => s.status === "Unclaimed")) return "priority-unclaimed";
        return "priority-completed";
    };

    const isToday = (dateString: string): boolean => {
        const today = new Date().toISOString().split('T')[0];
        return dateString === today;
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToCurrentMonth = () => {
        setCurrentDate(new Date());
    };

    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: ""
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({
                day,
                isCurrentMonth: true,
                date: dateString
            });
        }

        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                day,
                isCurrentMonth: false,
                date: ""
            });
        }

        return days;
    };

    const handleDateClick = (dateString: string) => {
        if (!dateString) return;

        const schedulesForDate = getSchedulesForDate(dateString);
        if (schedulesForDate.length === 0) return;

        setSelectedDate(dateString);
        setListModalOpen(true);
    };

    const handleSelectSchedule = (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setListModalOpen(false);
        setEditModalOpen(true);
    };

    const handleCloseListModal = () => {
        setListModalOpen(false);
        setSelectedDate(null);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setSelectedSchedule(null);
        // fetchSchedules();
    };

    const calendarDays = generateCalendarDays();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    return (
        <div className="service-page">
            <EmployeeNavbar />
            <SystemTitle />

            <div className="scheduling-container">
                <h2 className="scheduling-title">Schedule Pickup/Delivery</h2>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading schedules...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p className="error-message">{error}</p>
                        <button onClick={fetchSchedules} className="retry-btn">Retry</button>
                    </div>
                ) : (
                    <div className="scheduling-layout">
                        <div className="stats-sidebar">
                            <div className="stats-header">
                                <h3>Statistics</h3>
                                <select
                                    value={statsTimeRange}
                                    onChange={(e) => setStatsTimeRange(e.target.value as TimeRange)}
                                    className="stats-timerange-select"
                                >
                                    <option value="day">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="year">This Year</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>

                            <div className="stats-cards">
                                <div className="stat-card stat-pending">
                                    <div className="stat-number">{calculateStats.pending}</div>
                                    <div className="stat-label">Pending</div>
                                </div>
                                <div className="stat-card stat-completed">
                                    <div className="stat-number">{calculateStats.completed}</div>
                                    <div className="stat-label">Completed</div>
                                </div>
                                <div className="stat-card stat-unclaimed">
                                    <div className="stat-number">{calculateStats.unclaimed}</div>
                                    <div className="stat-label">Unclaimed</div>
                                </div>
                                <div className="stat-card stat-late">
                                    <div className="stat-number">{calculateStats.late}</div>
                                    <div className="stat-label">Late</div>
                                </div>
                            </div>

                            <div className="legend">
                                <h4>Calendar Legend</h4>
                                <div className="legend-item">
                                    <span className="legend-color priority-late"></span>
                                    <span>Late</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-color priority-pending"></span>
                                    <span>Pending</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-color priority-unclaimed"></span>
                                    <span>Unclaimed</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-color priority-completed"></span>
                                    <span>Completed</span>
                                </div>
                            </div>
                        </div>

                        <div className="calendar-card">
                            <div className="calendar-header">
                                <h3 className="calendar-month">
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h3>
                                <div className="calendar-nav">
                                    <button onClick={goToPreviousMonth} className="nav-btn">&lt;</button>
                                    <button onClick={goToCurrentMonth} className="nav-btn today-btn" title="Go to current month">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </button>
                                    <button onClick={goToNextMonth} className="nav-btn">&gt;</button>
                                </div>
                            </div>

                            <div className="calendar-grid">
                                {["S", "M", "T", "W", "TH", "F", "ST"].map((day, index) => (
                                    <div key={index} className="calendar-day-header">
                                        {day}
                                    </div>
                                ))}

                                {calendarDays.map((dayInfo, index) => {
                                    const scheduleCount = dayInfo.date ? getScheduleCount(dayInfo.date) : 0;
                                    const priorityClass = dayInfo.date ? getDatePriorityColor(dayInfo.date) : "";
                                    const isTodayDate = dayInfo.date ? isToday(dayInfo.date) : false;

                                    return (
                                        <div
                                            key={index}
                                            className={`calendar-day ${!dayInfo.isCurrentMonth ? 'other-month' : ''} ${priorityClass} ${isTodayDate ? 'today' : ''}`}
                                            onClick={() => handleDateClick(dayInfo.date)}
                                        >
                                            <span className="day-number">{dayInfo.day}</span>
                                            {scheduleCount > 0 && (
                                                <span className="schedule-count">{scheduleCount}</span>
                                            )}
                                            {isTodayDate && <span className="today-indicator">●</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isListModalOpen && selectedDate && (
                <ScheduleListModal
                    date={selectedDate}
                    schedules={getSchedulesForDate(selectedDate)}
                    onSelectSchedule={handleSelectSchedule}
                    onClose={handleCloseListModal}
                />
            )}

            {isEditModalOpen && selectedSchedule && (
                <EditScheduleModal
                    schedule={selectedSchedule}
                    onSave={handleSaveSchedule}
                    onClose={handleCloseEditModal}
                />
            )}
        </div>
    );
};

export default EmployeeScheduling;