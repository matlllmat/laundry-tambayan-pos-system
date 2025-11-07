<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

$query = "SELECT * FROM orders";
$result = mysqli_query($conn, $query);

$orders = [];
while ($row = mysqli_fetch_assoc($result)) {
    $orders[] = $row;
}

echo json_encode($orders);
