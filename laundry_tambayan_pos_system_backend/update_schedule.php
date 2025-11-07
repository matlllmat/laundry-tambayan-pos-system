<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

// Check if user is logged in - FIXED: Changed from employee_id to id
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized access"
    ]);
    exit;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON data"
    ]);
    exit;
}

// Validate required field
if (!isset($data['scheduleId'])) {
    echo json_encode([
        "success" => false,
        "message" => "Schedule ID is required"
    ]);
    exit;
}

$scheduleId = intval($data['scheduleId']);

// Build update query dynamically based on provided fields
$updateFields = [];
$params = [];
$types = "";

// Check and add each updatable field
if (isset($data['status'])) {
    $status = strtolower($data['status']); // Convert to lowercase for database

    // Validate status
    $validStatuses = ['pending', 'completed', 'unclaimed', 'late'];
    if (!in_array($status, $validStatuses)) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid status value"
        ]);
        exit;
    }

    $updateFields[] = "order_status = ?";
    $params[] = $status;
    $types .= "s";
}

if (isset($data['date'])) {
    // Validate date format
    $date = $data['date'];
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid date format. Use YYYY-MM-DD"
        ]);
        exit;
    }

    $updateFields[] = "schedule_date = ?";
    $params[] = $date;
    $types .= "s";
}

if (isset($data['customerName'])) {
    $updateFields[] = "customer_name = ?";
    $params[] = $data['customerName'];
    $types .= "s";
}

if (isset($data['contact'])) {
    $updateFields[] = "contact = ?";
    $params[] = $data['contact'];
    $types .= "s";
}

if (isset($data['address'])) {
    $updateFields[] = "address = ?";
    $params[] = $data['address'];
    $types .= "s";
}

// Check if there are any fields to update
if (empty($updateFields)) {
    echo json_encode([
        "success" => false,
        "message" => "No fields to update"
    ]);
    exit;
}

// Add schedule ID to params
$params[] = $scheduleId;
$types .= "i";

// Build the SQL query
$sql = "UPDATE orders SET " . implode(", ", $updateFields) . " WHERE order_id = ?";

// Prepare statement
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare statement: " . $conn->error
    ]);
    exit;
}

// Bind parameters dynamically
$stmt->bind_param($types, ...$params);

// Execute the update
if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Schedule updated successfully",
            "affected_rows" => $stmt->affected_rows
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "No changes made or schedule not found"
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to update schedule: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
