<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Decode JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit;
}

// Validate required fields
$required = ["employee_id", "total_weight", "total_load", "total_amount", "customer_name", "schedule_type", "schedule_date", "order_items"];
foreach ($required as $field) {
    if (!isset($data[$field]) || $data[$field] === "") {
        echo json_encode(["success" => false, "message" => "Missing field: $field"]);
        exit;
    }
}

// Prepare order insert
$stmt = $conn->prepare("INSERT INTO orders (employee_id, total_weight, total_load, total_amount, customer_name, contact, address, schedule_type, schedule_date, order_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
$stmt->bind_param(
    "iddssssss",
    $data["employee_id"],
    $data["total_weight"],
    $data["total_load"],
    $data["total_amount"],
    $data["customer_name"],
    $data["contact"],
    $data["address"],
    $data["schedule_type"],
    $data["schedule_date"]
);

if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "Failed to insert order: " . $stmt->error]);
    exit;
}

$order_id = $conn->insert_id;

// Insert order items
$item_stmt = $conn->prepare("INSERT INTO order_items (order_id, service_name, price, calculated_amount) VALUES (?, ?, ?, ?)");
foreach ($data["order_items"] as $item) {
    $item_stmt->bind_param("isdd", $order_id, $item["service_name"], $item["price"], $item["calculated_amount"]);
    $item_stmt->execute();
}

echo json_encode([
    "success" => true,
    "message" => "Order created successfully.",
    "order_id" => $order_id
]);

$conn->close();
