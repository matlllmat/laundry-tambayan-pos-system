<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$order_id = $data['order_id'];
$items = $data['items'];

mysqli_query($conn, "DELETE FROM order_items WHERE order_id='$order_id'");

foreach ($items as $item) {
    $service_name = $item['service_name'];
    $price = $item['price'];
    $calculated_amount = $item['calculated_amount'];
    mysqli_query($conn, "INSERT INTO order_items (order_id, service_name, price, calculated_amount)
                         VALUES ('$order_id', '$service_name', '$price', '$calculated_amount')");
}

echo json_encode(["success" => true]);
