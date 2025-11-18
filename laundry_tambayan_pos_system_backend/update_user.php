<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $_SESSION['id'];
$editedUser = $data ?? [];
$password = $data['password'] ?? '';
$settings = $data['settings'] ?? [];

// Password is required for any update
if (empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password is required"
    ]);
    exit;
}

// Verify user password
$check_sql = "SELECT password, type FROM employees WHERE id = ?";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
    exit;
}

$user = $check_result->fetch_assoc();
if (trim($password) !== trim($user['password'])) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid password"
    ]);
    exit;
}

$check_stmt->close();

// --- Start transaction ---
$conn->begin_transaction();

// --- Validate Email ---
if (!filter_var($editedUser['email'], FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email format"
    ]);
    exit;
}

// --- Validate Phone (must start with 09 and be 11 digits) ---
if (!preg_match('/^09\d{9}$/', $editedUser['phone'])) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid phone number. It must start with 09 and have 11 digits."
    ]);
    exit;
}


try {
    // --- Update user email/phone ---
    $update_user_sql = "UPDATE employees SET email = ?, phone = ? WHERE id = ?";
    $update_user_stmt = $conn->prepare($update_user_sql);
    $update_user_stmt->bind_param("ssi", $editedUser['email'], $editedUser['phone'], $user_id);
    if (!$update_user_stmt->execute()) {
        throw new Exception("Failed to update user info");
    }
    $update_user_stmt->close();

    // --- Update system settings if admin ---
    if ($user['type'] === 'admin' && !empty($settings)) {
        $required_settings = ['system_title', 'weight_per_load', 'load_limit', 'delivery_fee'];
        foreach ($required_settings as $setting) {
            if (!isset($settings[$setting]) || trim($settings[$setting]) === '') {
                throw new Exception("Missing required setting: " . str_replace('_', ' ', $setting));
            }
        }

        // Validate numeric values
        if (!is_numeric($settings['weight_per_load']) || floatval($settings['weight_per_load']) <= 0) {
            throw new Exception("Weight per load must be a positive number");
        }
        if (!is_numeric($settings['load_limit']) || intval($settings['load_limit']) <= 0) {
            throw new Exception("Load limit must be a positive number");
        }
        if (!is_numeric($settings['delivery_fee']) || floatval($settings['delivery_fee']) < 0) {
            throw new Exception("Delivery fee must be a non-negative number");
        }

        // Update settings
        foreach ($settings as $setting_name => $setting_value) {
            if ($setting_name === 'favicon_logo' || $setting_name === 'bacground_image') continue;

            $update_sql = "UPDATE settings SET setting_value = ? WHERE setting_name = ?";
            $update_stmt = $conn->prepare($update_sql);
            $update_stmt->bind_param("ss", $setting_value, $setting_name);
            if (!$update_stmt->execute()) {
                throw new Exception("Failed to update setting: $setting_name");
            }
            $update_stmt->close();
        }
    }

    $conn->commit();
    echo json_encode([
        "success" => true,
        "message" => "User info and settings updated successfully"
    ]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
