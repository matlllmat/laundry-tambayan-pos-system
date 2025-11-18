<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$order_id = $data['order_id'];
$items = $data['items'];

// Delete old items
$stmt = $conn->prepare("DELETE FROM order_items WHERE order_id=?");
$stmt->bind_param("i", $order_id);
$stmt->execute();
$stmt->close();

// Insert new items
foreach ($items as $item) {
    $stmt2 = $conn->prepare("INSERT INTO order_items (order_id, service_name, price, quantity, calculated_amount) VALUES (?, ?, ?, ?, ?)");
    $stmt2->bind_param("isdid", $order_id, $item['service_name'], $item['price'], $item['quantity'], $item['calculated_amount']);
    $stmt2->execute();
    $stmt2->close();
}

echo json_encode(["success" => true]);
$conn->close();
