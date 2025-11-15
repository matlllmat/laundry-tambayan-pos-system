<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

// MODIFIED: Removed 'expense_cost' from the SELECT
$result = $conn->query("SELECT budget_id, expense_name, budget_allocated, date_start, date_end, daily FROM budget ORDER BY date_start DESC");

if (!$result) {
    echo json_encode(["success" => false, "message" => "Database query failed: " . $conn->error]);
    exit;
}

$budget_entries = [];
while ($row = $result->fetch_assoc()) {
    $row['budget_allocated'] = (float)$row['budget_allocated'];
    $row['daily'] = (float)$row['daily']; // Fetch the daily amount
    $budget_entries[] = $row;
}

echo json_encode(["success" => true, "data" => $budget_entries]);
$conn->close();
?>