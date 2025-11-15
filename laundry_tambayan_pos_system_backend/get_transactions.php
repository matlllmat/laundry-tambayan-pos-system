<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

// 1. Fetch all orders
// We format the dates and order ID in SQL to match your component
$orders_result = $conn->query(
    "SELECT 
        order_id, 
        customer_name, 
        total_weight, 
        total_load, 
        DATE(created_at) AS transaction_date, 
        schedule_type, 
        schedule_date, 
        total_amount 
    FROM orders 
    ORDER BY created_at DESC"
);

if (!$orders_result) {
    echo json_encode(["success" => false, "message" => "Failed to fetch orders: " . $conn->error]);
    exit;
}

$orders = [];
$order_ids = [];
while ($row = $orders_result->fetch_assoc()) {
    $row['order_id'] = (int)$row['order_id'];
    $orders[] = $row;
    $order_ids[] = $row['order_id'];
}

$transactions = [];
if (empty($order_ids)) {
     // No orders found, return empty array
     echo json_encode(["success" => true, "data" => []]);
     $conn->close();
     exit;
}

// 2. Fetch all related order_items for all the orders in one query
$ids_string = implode(',', $order_ids);
$items_result = $conn->query(
    "SELECT 
        order_id, 
        service_name, 
        quantity, 
        price, 
        calculated_amount 
    FROM order_items 
    WHERE order_id IN ($ids_string)"
);

if (!$items_result) {
    echo json_encode(["success" => false, "message" => "Failed to fetch order items: " . $conn->error]);
    exit;
}

// 3. Create a lookup map for items (order_id => [array of items])
$items_map = [];
while ($item_row = $items_result->fetch_assoc()) {
    $order_id = (int)$item_row['order_id'];
    if (!isset($items_map[$order_id])) {
        $items_map[$order_id] = [];
    }
    // Map to your component's 'ServiceItem' interface
    $items_map[$order_id][] = [
        'name' => $item_row['service_name'],
        'qty' => (int)$item_row['quantity'],
        'price' => (float)$item_row['price'],
        'subtotal' => (float)$item_row['calculated_amount']
    ];
}

// 4. Assemble the final transactions array
foreach ($orders as $order) {
    $order_id = $order['order_id'];
    
    // Map to your component's 'Transaction' interface
    $transactions[] = [
        'id' => (string)$order_id, // Component expects string ID
        'orderNumber' => 'ORD-' . str_pad($order_id, 3, '0', STR_PAD_LEFT),
        'customerName' => $order['customer_name'],
        'loadWeight' => (string)$order['total_weight'], // Component expects string
        'numLoads' => (string)$order['total_load'], // Component expects string
        'transactionDate' => $order['transaction_date'],
        'scheduleType' => $order['schedule_type'],
        'scheduleDate' => $order['schedule_date'],
        'total' => (float)$order['total_amount'],
        'serviceItems' => isset($items_map[$order_id]) ? $items_map[$order_id] : []
    ];
}

echo json_encode(["success" => true, "data" => $transactions]);
$conn->close();
?>