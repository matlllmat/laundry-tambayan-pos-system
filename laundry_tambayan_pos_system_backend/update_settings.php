<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Check if user is logged in and is admin
if (!isset($_SESSION['id']) || $_SESSION['type'] !== 'admin') {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized access. Admin privileges required."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $_SESSION['id'];
$settings = $data['settings'] ?? [];
$password = $data['password'] ?? '';

// Validate password
if (empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password is required"
    ]);
    exit;
}

// Verify admin password
$check_sql = "SELECT password FROM employees WHERE id = ? AND type = 'admin'";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Admin user not found"
    ]);
    exit;
}

$admin = $check_result->fetch_assoc();
if (trim($password) !== trim($admin['password'])) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid password"
    ]);
    exit;
}

$check_stmt->close();

// Validate settings
$required_settings = ['system_title', 'weight_per_load', 'load_limit', 'delivery_fee'];
foreach ($required_settings as $setting) {
    if (!isset($settings[$setting]) || trim($settings[$setting]) === '') {
        echo json_encode([
            "success" => false,
            "message" => "Missing required setting: " . str_replace('_', ' ', $setting)
        ]);
        exit;
    }
}

// Validate numeric values
if (!is_numeric($settings['weight_per_load']) || floatval($settings['weight_per_load']) <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Weight per load must be a positive number"
    ]);
    exit;
}

if (!is_numeric($settings['load_limit']) || intval($settings['load_limit']) <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Load limit must be a positive number"
    ]);
    exit;
}

if (!is_numeric($settings['delivery_fee']) || floatval($settings['delivery_fee']) < 0) {
    echo json_encode([
        "success" => false,
        "message" => "Delivery fee must be a non-negative number"
    ]);
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    // Update each setting
    foreach ($settings as $setting_name => $setting_value) {
        // Skip image settings as they're handled separately
        if ($setting_name === 'favicon_logo' || $setting_name === 'bacground_image') {
            continue;
        }
        
        $update_sql = "UPDATE settings SET setting_value = ? WHERE setting_name = ?";
        $update_stmt = $conn->prepare($update_sql);
        $update_stmt->bind_param("ss", $setting_value, $setting_name);
        
        if (!$update_stmt->execute()) {
            throw new Exception("Failed to update setting: $setting_name");
        }
        
        $update_stmt->close();
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        "success" => true,
        "message" => "Settings updated successfully"
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();