<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");
header('Content-Type: application/json');

// ============================================================
// FILE 3: get_snapshots.php
// Retrieves all saved snapshots
// ============================================================
// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated. Please log in."
    ]);
    exit;
}

$sql = "SELECT 
    s.snapshot_id,
    s.report_name,
    s.date_from,
    s.date_to,
    s.gross_income,
    s.total_expenses,
    s.net_income,
    s.total_orders,
    s.total_budget_entries,
    s.created_at,
    s.notes,
    e.name as created_by_name
FROM income_report_snapshots s
JOIN employees e ON s.created_by = e.id
ORDER BY s.created_at DESC";

$result = $conn->query($sql);
$snapshots = [];

while ($row = $result->fetch_assoc()) {
    $snapshots[] = [
        'snapshot_id' => intval($row['snapshot_id']),
        'report_name' => $row['report_name'],
        'date_from' => $row['date_from'],
        'date_to' => $row['date_to'],
        'gross_income' => floatval($row['gross_income']),
        'total_expenses' => floatval($row['total_expenses']),
        'net_income' => floatval($row['net_income']),
        'total_orders' => intval($row['total_orders']),
        'total_budget_entries' => intval($row['total_budget_entries']),
        'created_at' => $row['created_at'],
        'created_by_name' => $row['created_by_name'],
        'notes' => $row['notes']
    ];
}

echo json_encode([
    "success" => true,
    "data" => $snapshots
]);

$conn->close();
