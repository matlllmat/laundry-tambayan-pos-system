<?php
header("Content-Type: application/json");
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Decode JSON input
$data = json_decode(file_get_contents("php://input"), true);

$employee_id = $_SESSION['id'] ?? null;

if (!$employee_id) {
    echo json_encode(["success" => false, "message" => "Unauthorized: No employee logged in."]);
    exit;
}

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit;
}

// Validate required fields (employee_id removed!)
$required = ["total_weight", "total_load", "total_amount", "customer_name", "schedule_type", "schedule_date", "order_items"];
foreach ($required as $field) {
    if (!isset($data[$field]) || $data[$field] === "") {
        echo json_encode(["success" => false, "message" => "Missing field: $field"]);
        exit;
    }
}

// Insert into orders
$stmt = $conn->prepare("
    INSERT INTO orders 
    (employee_id, total_weight, total_load, weight_per_load_snapshot, total_amount, customer_name, contact, address, schedule_type, schedule_date, order_status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
");

$stmt->bind_param(
    "idddssssss",
    $employee_id,
    $data["total_weight"],
    $data["total_load"],
    $data["weight_per_load_snapshot"],
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

// Insert items
foreach ($data["order_items"] as $item) {

    $stmt2 = $conn->prepare("
        INSERT INTO order_items 
        (order_id, service_name, price, quantity, calculated_amount)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmt2->bind_param(
        "isdid",
        $order_id,
        $item["service_name"],
        $item["price"],
        $item["quantity"],
        $item["calculated_amount"]
    );

    if (!$stmt2->execute()) {
        echo json_encode(["success" => false, "message" => "Failed to insert item: " . $stmt2->error]);
        exit;
    }
}

echo json_encode([
    "success" => true,
    "message" => "Order created successfully",
    "order_id" => $order_id
]);

$conn->close();
