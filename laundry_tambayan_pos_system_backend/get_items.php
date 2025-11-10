<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Fetch all items
$result = $conn->query("SELECT item_id, item_name, item_type, item_price FROM items");

if (!$result) {
    echo json_encode(["success" => false, "message" => "Query failed: " . $conn->error]);
    exit;
}

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

echo json_encode(["success" => true, "data" => $items]);
$conn->close();
