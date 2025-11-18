<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

header('Content-Type: application/json');

// Fetch all orders with their items
$query = "
    SELECT 
        o.order_id,
        o.employee_id,
        o.total_weight,
        o.total_load,
        o.weight_per_load_snapshot,
        o.total_amount,
        o.customer_name,
        o.contact,
        o.address,
        o.schedule_type,
        o.schedule_date,
        o.created_at,
        o.order_status
    FROM orders o
    ORDER BY o.schedule_date DESC
";

$result = mysqli_query($conn, $query);

if (!$result) {
    echo json_encode([
        "success" => false,
        "message" => "Query failed: " . mysqli_error($conn)
    ]);
    exit;
}

$schedules = [];

while ($order = mysqli_fetch_assoc($result)) {
    $order_id = $order['order_id'];

    // Fetch order items for this order
    $items_query = "
        SELECT 
            service_name,
            price,
            calculated_amount
        FROM order_items
        WHERE order_id = $order_id
    ";

    $items_result = mysqli_query($conn, $items_query);
    $serviceItems = [];

    while ($item = mysqli_fetch_assoc($items_result)) {
        // Calculate quantity: calculated_amount / price
        $qty = $item['price'] > 0 ? round($item['calculated_amount'] / $item['price']) : 0;

        $serviceItems[] = [
            'name' => $item['service_name'],
            'qty' => $qty,
            'price' => floatval($item['price']),
            'subtotal' => floatval($item['calculated_amount'])
        ];
    }

    // Format the schedule object
    $schedules[] = [
        'scheduleId' => strval($order_id),
        'orderNumber' => 'ORD-' . str_pad($order_id, 3, '0', STR_PAD_LEFT),
        'customerName' => $order['customer_name'],
        'contact' => $order['contact'],
        'address' => $order['address'],
        'loadWeight' => strval($order['total_weight']),
        'numLoads' => strval($order['total_load']),
        'weightPerLoadSnapshot' => floatval($order['weight_per_load_snapshot']),
        'transactionDate' => $order['created_at'] ? date('Y-m-d', strtotime($order['created_at'])) : date('Y-m-d'),
        'scheduleType' => $order['schedule_type'],
        'date' => $order['schedule_date'],
        'status' => ucfirst($order['order_status']), // Convert 'pending' to 'Pending'
        'notes' => '', // No notes field in database yet
        'serviceItems' => $serviceItems,
        'total' => floatval($order['total_amount'])
    ];
}

echo json_encode([
    "success" => true,
    "data" => $schedules
]);

$conn->close();
