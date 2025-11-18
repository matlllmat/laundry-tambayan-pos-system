<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");

// Disable error output
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set JSON header
header("Content-Type: application/json");

// Only proceed with POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get and validate input
    $input = file_get_contents("php://input");

    if (empty($input)) {
        throw new Exception("Empty request body");
    }

    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON: " . json_last_error_msg());
    }

    if (!isset($data['orders']) || !is_array($data['orders']) || empty($data['orders'])) {
        throw new Exception("Invalid request: orders array is required and must not be empty");
    }

    // Check database connection
    if (!isset($conn) || $conn->connect_error) {
        throw new Exception("Database connection failed");
    }

    // Start transaction
    $conn->begin_transaction();

    // Prepare statement
    $stmt = $conn->prepare("UPDATE orders SET order_status = ? WHERE order_id = ? AND order_status = 'pending'");

    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }

    $updatedCount = 0;
    $validStatuses = ['pending', 'completed', 'late', 'unclaimed'];

    foreach ($data['orders'] as $order) {
        // Validate order data
        if (!isset($order['order_id']) || !isset($order['order_status'])) {
            continue;
        }

        if (!in_array($order['order_status'], $validStatuses)) {
            continue;
        }

        // Execute update
        $stmt->bind_param("si", $order['order_status'], $order['order_id']);

        if ($stmt->execute()) {
            $updatedCount += $stmt->affected_rows;
        }
    }

    $stmt->close();
    $conn->commit();

    // Success response
    echo json_encode([
        'success' => true,
        'message' => "Successfully updated $updatedCount order(s)",
        'updated_count' => $updatedCount
    ]);
} catch (Exception $e) {
    // Rollback on error
    if (isset($conn) && method_exists($conn, 'rollback')) {
        $conn->rollback();
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => true
    ]);
}

// Close connection
if (isset($conn)) {
    $conn->close();
}
