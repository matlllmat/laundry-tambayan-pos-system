import React, { useState, useEffect } from 'react';
import { Settings, X, Upload, User, Lock } from 'lucide-react';
import './SettingsFooter.css';

interface UserInfo {
    id: number;
    name: string;
    email: string;
    phone: string;
    type: 'admin' | 'employee';
}

interface SettingsData {
    system_title: string;
    weight_per_load: string;
    load_limit: string;
    delivery_fee: string;
    favicon_logo: string;
    bacground_image: string;
}

const SettingsFooter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [settings, setSettings] = useState<SettingsData>({
        system_title: '',
        weight_per_load: '',
        load_limit: '',
        delivery_fee: '',
        favicon_logo: '',
        bacground_image: ''
    });

    const [editedUser, setEditedUser] = useState({ email: '', phone: '' });
    const [editedSettings, setEditedSettings] = useState<SettingsData>({
        system_title: '',
        weight_per_load: '',
        load_limit: '',
        delivery_fee: '',
        favicon_logo: '',
        bacground_image: ''
    });

    const [authPassword, setAuthPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string>('');
    const [bgPreview, setBgPreview] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            fetchUserInfo();
            fetchSettings();
        }
    }, [isOpen]);

    const fetchUserInfo = async () => {
        try {
            const response = await fetch('http://localhost/laundry_tambayan_pos_system_backend/get_user_info.php', {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setUser(data.user);
                setEditedUser({ email: data.user.email, phone: data.user.phone });
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch('http://localhost/laundry_tambayan_pos_system_backend/get_settings.php');
            const data = await response.json();
            if (data.success) {
                const settingsObj: any = {};
                data.settings.forEach((s: any) => {
                    settingsObj[s.setting_name] = s.setting_value;
                });
                setSettings(settingsObj);
                setEditedSettings(settingsObj);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'favicon' | 'bg') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'favicon') {
                setFaviconFile(file);
                setFaviconPreview(reader.result as string);
            } else {
                setBgFile(file);
                setBgPreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const validateForm = (): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editedUser.email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return false;
        }

        const phoneRegex = /^09\d{9}$/;
        if (editedUser.phone && !phoneRegex.test(editedUser.phone)) {
            setMessage({ type: 'error', text: 'Phone must be 11 digits starting with 09' });
            return false;
        }

        if (user?.type === 'admin') {
            if (!editedSettings.system_title.trim()) {
                setMessage({ type: 'error', text: 'System title is required' });
                return false;
            }

            const weightPerLoad = parseFloat(editedSettings.weight_per_load);
            if (isNaN(weightPerLoad) || weightPerLoad <= 0) {
                setMessage({ type: 'error', text: 'Weight per load must be a positive number' });
                return false;
            }

            const loadLimit = parseInt(editedSettings.load_limit);
            if (isNaN(loadLimit) || loadLimit <= 0) {
                setMessage({ type: 'error', text: 'Load limit must be a positive number' });
                return false;
            }

            const deliveryFee = parseFloat(editedSettings.delivery_fee);
            if (isNaN(deliveryFee) || deliveryFee < 0) {
                setMessage({ type: 'error', text: 'Delivery fee must be a non-negative number' });
                return false;
            }
        }

        return true;
    };

    const handleSaveClick = () => {
        if (!validateForm()) return;
        setAuthPassword('');
        setMessage({ type: '', text: '' });
    };

    const handleConfirmSave = async () => {
        if (!editedUser.email && !editedUser.phone) return;

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // --- Update user info (everyone can do this) ---
            const userResponse = await fetch('http://localhost/laundry_tambayan_pos_system_backend/update_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: editedUser.email,
                    phone: editedUser.phone,
                    password: authPassword
                })
            });

            const userData = await userResponse.json();
            if (!userData.success) {
                setMessage({ type: 'error', text: userData.message });
                setIsSaving(false);
                return;
            }

            // --- Only admin can update system settings ---
            if (user?.type === 'admin') {
                if (!authPassword) {
                    setMessage({ type: 'error', text: 'Password is required to update system settings' });
                    setIsSaving(false);
                    return;
                }

                const settingsResponse = await fetch('http://localhost/laundry_tambayan_pos_system_backend/update_settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        settings: editedSettings,
                        password: authPassword
                    })
                });

                const settingsData = await settingsResponse.json();
                if (!settingsData.success) {
                    setMessage({ type: 'error', text: settingsData.message });
                    setIsSaving(false);
                    return;
                }

                // --- Handle image uploads for admin ---
                if (faviconFile || bgFile) {
                    const formData = new FormData();
                    if (faviconFile) formData.append('favicon', faviconFile);
                    if (bgFile) formData.append('background', bgFile);
                    formData.append('old_favicon', settings.favicon_logo);
                    formData.append('old_background', settings.bacground_image);

                    const uploadResponse = await fetch('http://localhost/laundry_tambayan_pos_system_backend/upload_images.php', {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });

                    const uploadData = await uploadResponse.json();
                    if (!uploadData.success) {
                        setMessage({ type: 'error', text: uploadData.message });
                        setIsSaving(false);
                        return;
                    }
                }
            }

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setAuthPassword('');
            setFaviconFile(null);
            setBgFile(null);
            setFaviconPreview('');
            setBgPreview('');

            fetchUserInfo();
            fetchSettings();

        } catch (error) {
            setMessage({ type: 'error', text: 'Network error occurred' });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <>
            <div
                className={`settings-footer-icon ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Settings size={24} />
            </div>

            <div className={`settings-footer-panel ${isOpen ? 'open' : ''}`}>
                <div className="settings-footer-header">
                    <h2>Settings</h2>
                    <button className="settings-footer-close-btn" onClick={() => setIsOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <div className="settings-footer-content">
                    <div className="settings-footer-section">
                        <div className="settings-footer-section-header">
                            <User size={18} />
                            <h3>User Information</h3>
                        </div>

                        {user && (
                            <div className="settings-footer-user-info">
                                <div className="settings-footer-info-row">
                                    <label>ID:</label>
                                    <span>{user.id}</span>
                                </div>
                                <div className="settings-footer-info-row">
                                    <label>Name:</label>
                                    <span>{user.name}</span>
                                </div>
                                <div className="settings-footer-info-row">
                                    <label>Role:</label>
                                    <span className="settings-footer-role-badge">{user.type}</span>
                                </div>
                                <div className="settings-footer-input-group">
                                    <label>Email:</label>
                                    <input
                                        type="email"
                                        value={editedUser.email}
                                        onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                                    />
                                </div>
                                <div className="settings-footer-input-group">
                                    <label>Phone:</label>
                                    <input
                                        type="text"
                                        value={editedUser.phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            if (value.length <= 11) {
                                                setEditedUser({ ...editedUser, phone: value });
                                            }
                                        }}
                                        placeholder="09171234567"
                                        maxLength={11}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="settings-footer-section">
                        <div className="settings-footer-section-header">
                            <Settings size={18} />
                            <h3>System Settings</h3>
                            {user?.type === 'employee' && (
                                <span className="settings-footer-view-only">(View Only)</span>
                            )}
                        </div>

                        <div className="settings-footer-input-group">
                            <label>System Title:</label>
                            <input
                                type="text"
                                value={editedSettings.system_title}
                                onChange={(e) => setEditedSettings({ ...editedSettings, system_title: e.target.value })}
                                disabled={user?.type === 'employee'}
                            />
                        </div>

                        <div className="settings-footer-input-group">
                            <label>Weight per Load (kg):</label>
                            <input
                                type="number"
                                value={editedSettings.weight_per_load}
                                onChange={(e) => setEditedSettings({ ...editedSettings, weight_per_load: e.target.value })}
                                disabled={user?.type === 'employee'}
                                min="0"
                                step="0.1"
                            />
                        </div>

                        <div className="settings-footer-input-group">
                            <label>Load Limit:</label>
                            <input
                                type="number"
                                value={editedSettings.load_limit}
                                onChange={(e) => setEditedSettings({ ...editedSettings, load_limit: e.target.value })}
                                disabled={user?.type === 'employee'}
                                min="0"
                            />
                        </div>

                        <div className="settings-footer-input-group">
                            <label>Delivery Fee (₱):</label>
                            <input
                                type="number"
                                value={editedSettings.delivery_fee}
                                onChange={(e) => setEditedSettings({ ...editedSettings, delivery_fee: e.target.value })}
                                disabled={user?.type === 'employee'}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>
                    {/* Authentication input above Save Changes */}
                    <div className="settings-footer-input-group">
                        <label>Enter Password to Save:</label>
                        <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="settings-footer-password-input"
                            autoComplete="new-password"
                            autoCapitalize="off"
                            spellCheck="false"
                            autoCorrect="off"
                        />

                    </div>

                    {/* Message display */}
                    {message.text && (
                        <div className={`settings-footer-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Save / Cancel buttons */}
                    <div className="settings-footer-actions">
                        <button
                            className="settings-footer-save-btn"
                            onClick={handleConfirmSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsFooter;