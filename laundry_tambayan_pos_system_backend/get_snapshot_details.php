<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");
header('Content-Type: application/json');

// ============================================================
// FILE 4: get_snapshot_details.php
// Retrieves detailed expense breakdown for a specific snapshot
// ============================================================
// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated. Please log in."
    ]);
    exit;
}

$snapshot_id = $_GET['id'] ?? 0;

if (empty($snapshot_id)) {
    echo json_encode([
        "success" => false,
        "message" => "Snapshot ID is required."
    ]);
    exit;
}

// Get snapshot header info
$sql_snapshot = "SELECT 
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
WHERE s.snapshot_id = ?";

$stmt_snapshot = $conn->prepare($sql_snapshot);
$stmt_snapshot->bind_param("i", $snapshot_id);
$stmt_snapshot->execute();
$result_snapshot = $stmt_snapshot->get_result();

if ($result_snapshot->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Snapshot not found."
    ]);
    exit;
}

$snapshot = $result_snapshot->fetch_assoc();
$stmt_snapshot->close();

// Get expense details
$sql_details = "SELECT 
    expense_name,
    budget_allocated,
    daily_cost,
    budget_date_start,
    budget_date_end,
    overlap_days,
    proportional_expense
FROM snapshot_expense_details
WHERE snapshot_id = ?
ORDER BY proportional_expense DESC";

$stmt_details = $conn->prepare($sql_details);
$stmt_details->bind_param("i", $snapshot_id);
$stmt_details->execute();
$result_details = $stmt_details->get_result();

$expense_details = [];
while ($row = $result_details->fetch_assoc()) {
    $expense_details[] = [
        'expense_name' => $row['expense_name'],
        'budget_allocated' => floatval($row['budget_allocated']),
        'daily_cost' => floatval($row['daily_cost']),
        'budget_date_start' => $row['budget_date_start'],
        'budget_date_end' => $row['budget_date_end'],
        'overlap_days' => intval($row['overlap_days']),
        'proportional_expense' => floatval($row['proportional_expense'])
    ];
}

$stmt_details->close();

echo json_encode([
    "success" => true,
    "data" => [
        'snapshot' => [
            'snapshot_id' => intval($snapshot['snapshot_id']),
            'report_name' => $snapshot['report_name'],
            'date_from' => $snapshot['date_from'],
            'date_to' => $snapshot['date_to'],
            'gross_income' => floatval($snapshot['gross_income']),
            'total_expenses' => floatval($snapshot['total_expenses']),
            'net_income' => floatval($snapshot['net_income']),
            'total_orders' => intval($snapshot['total_orders']),
            'total_budget_entries' => intval($snapshot['total_budget_entries']),
            'created_at' => $snapshot['created_at'],
            'created_by_name' => $snapshot['created_by_name'],
            'notes' => $snapshot['notes']
        ],
        'expense_details' => $expense_details
    ]
]);

$conn->close();
