<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

header('Content-Type: application/json');

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['order_id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Order ID is required"
    ]);
    exit;
}

$order_id = intval($data['order_id']);

// Start transaction
mysqli_begin_transaction($conn);

try {
    // Delete order items first (foreign key constraint)
    $delete_items = "DELETE FROM order_items WHERE order_id = $order_id";
    if (!mysqli_query($conn, $delete_items)) {
        throw new Exception("Failed to delete order items");
    }

    // Delete the order
    $delete_order = "DELETE FROM orders WHERE order_id = $order_id";
    if (!mysqli_query($conn, $delete_order)) {
        throw new Exception("Failed to delete order");
    }

    // Commit transaction
    mysqli_commit($conn);

    echo json_encode([
        "success" => true,
        "message" => "Order deleted successfully"
    ]);
} catch (Exception $e) {
    // Rollback on error
    mysqli_rollback($conn);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
