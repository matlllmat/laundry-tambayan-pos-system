<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

$query = "SELECT 
            orders.order_id,
            orders.employee_id,
            orders.total_weight,
            orders.total_load,
            orders.weight_per_load_snapshot,
            orders.total_amount,
            orders.customer_name,
            orders.contact,
            orders.address,
            orders.schedule_type,
            orders.schedule_date,
            orders.created_at,
            orders.order_status,
            employees.name as employee_name
          FROM orders
          LEFT JOIN employees ON orders.employee_id = employees.id
          ORDER BY orders.order_id DESC";

$result = mysqli_query($conn, $query);

$orders = [];
while ($row = mysqli_fetch_assoc($result)) {
  $orders[] = $row;
}

echo json_encode($orders);
