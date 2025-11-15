<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Get the date from request
$date = isset($_GET['date']) ? $_GET['date'] : '';

if (empty($date)) {
    echo json_encode(["success" => false, "message" => "Date is required"]);
    exit();
}

// Query to get total loads for the specified date
$sql = "SELECT SUM(total_load) as total_loads FROM orders WHERE schedule_date = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $date);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$scheduled_loads = $row['total_loads'] ? intval($row['total_loads']) : 0;
$remaining_capacity = 30 - $scheduled_loads;

// Get next 7 available dates (excluding Sundays and dates with capacity)
$available_dates = [];
$current_date = new DateTime($date);
$days_checked = 0;
$max_days = 30; // Check up to 30 days ahead

while (count($available_dates) < 3 && $days_checked < $max_days) {
    $current_date->modify('+1 day');
    $check_date = $current_date->format('Y-m-d');
    $day_of_week = $current_date->format('w'); // 0 = Sunday

    // Skip Sundays
    if ($day_of_week == 0) {
        $days_checked++;
        continue;
    }

    // Check capacity for this date
    $sql = "SELECT SUM(total_load) as total_loads FROM orders WHERE schedule_date = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $check_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    $date_scheduled_loads = $row['total_loads'] ? intval($row['total_loads']) : 0;
    $date_remaining = 30 - $date_scheduled_loads;

    // Only suggest if has capacity
    if ($date_remaining > 0) {
        $available_dates[] = [
            'date' => $check_date,
            'remaining' => $date_remaining
        ];
    }

    $days_checked++;
}

echo json_encode([
    "success" => true,
    "scheduled_loads" => $scheduled_loads,
    "remaining_capacity" => $remaining_capacity,
    "available_dates" => $available_dates
]);

$stmt->close();
$conn->close();
