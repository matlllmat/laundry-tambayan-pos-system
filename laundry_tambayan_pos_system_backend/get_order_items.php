<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

$query = "SELECT * FROM order_items";
$result = mysqli_query($conn, $query);

$orderItems = [];
while ($row = mysqli_fetch_assoc($result)) {
    $orderItems[] = $row;
}

echo json_encode($orderItems);
