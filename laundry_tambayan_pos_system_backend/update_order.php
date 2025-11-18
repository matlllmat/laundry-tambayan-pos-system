<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

$order_id = $data['order_id'];
$total_weight = $data['total_weight'];
$total_load = $data['total_load'];
$total_amount = $data['total_amount'];
$customer_name = $data['customer_name'];
$contact = $data['contact'];
$address = $data['address'];
$schedule_type = $data['schedule_type'];
$schedule_date = $data['schedule_date'];

// Check if weight_per_load_snapshot should be updated
// If frontend sends it, update it; otherwise preserve existing value
$updateSnapshot = isset($data['weight_per_load_snapshot']);

if ($updateSnapshot) {
    $weight_per_load_snapshot = $data['weight_per_load_snapshot'];

    $stmt = $conn->prepare("UPDATE orders 
              SET total_weight=?, total_load=?, weight_per_load_snapshot=?, total_amount=?,
                  customer_name=?, contact=?, address=?,
                  schedule_type=?, schedule_date=?
              WHERE order_id=?");

    $stmt->bind_param(
        "ddddsssssi",
        $total_weight,
        $total_load,
        $weight_per_load_snapshot,
        $total_amount,
        $customer_name,
        $contact,
        $address,
        $schedule_type,
        $schedule_date,
        $order_id
    );
} else {
    // Don't update weight_per_load_snapshot - preserve original
    $stmt = $conn->prepare("UPDATE orders 
              SET total_weight=?, total_load=?, total_amount=?,
                  customer_name=?, contact=?, address=?,
                  schedule_type=?, schedule_date=?
              WHERE order_id=?");

    $stmt->bind_param(
        "dddsssssi",
        $total_weight,
        $total_load,
        $total_amount,
        $customer_name,
        $contact,
        $address,
        $schedule_type,
        $schedule_date,
        $order_id
    );
}

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => $stmt->error]);
}

$stmt->close();
$conn->close();
