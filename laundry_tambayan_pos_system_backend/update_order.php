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

$query = "UPDATE orders 
          SET total_weight='$total_weight', total_load='$total_load', total_amount='$total_amount',
              customer_name='$customer_name', contact='$contact', address='$address',
              schedule_type='$schedule_type', schedule_date='$schedule_date'
          WHERE order_id='$order_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => mysqli_error($conn)]);
}
