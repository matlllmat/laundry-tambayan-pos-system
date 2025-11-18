<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");
header('Content-Type: application/json');


// ============================================================
// FILE 1: calculate_report.php
// Calculates gross income, expenses, and net income for a date range
// ============================================================
// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated. Please log in."
    ]);
    exit;
}

$date_from = $_GET['from'] ?? '';
$date_to = $_GET['to'] ?? '';

if (empty($date_from) || empty($date_to)) {
    echo json_encode([
        "success" => false,
        "message" => "Date range is required."
    ]);
    exit;
}

// Validate date format
if (!strtotime($date_from) || !strtotime($date_to)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid date format."
    ]);
    exit;
}

if (strtotime($date_from) > strtotime($date_to)) {
    echo json_encode([
        "success" => false,
        "message" => "Start date must be before end date."
    ]);
    exit;
}

// ============================================================
// 1. Calculate Gross Income (from orders)
// ============================================================
$sql_gross = "SELECT 
    COALESCE(SUM(total_amount), 0) as gross_income,
    COUNT(order_id) as total_orders
FROM orders 
WHERE DATE(created_at) BETWEEN ? AND ?";

$stmt_gross = $conn->prepare($sql_gross);
$stmt_gross->bind_param("ss", $date_from, $date_to);
$stmt_gross->execute();
$result_gross = $stmt_gross->get_result();
$gross_data = $result_gross->fetch_assoc();

$gross_income = floatval($gross_data['gross_income']);
$total_orders = intval($gross_data['total_orders']);

// ============================================================
// 2. Calculate Total Expenses (proportional from budget)
// ============================================================
$sql_expenses = "SELECT 
    budget_id,
    expense_name,
    budget_allocated,
    daily,
    date_start,
    date_end,
    DATEDIFF(date_end, date_start) + 1 as total_days
FROM budget
WHERE date_start <= ? AND date_end >= ?";

$stmt_expenses = $conn->prepare($sql_expenses);
$stmt_expenses->bind_param("ss", $date_to, $date_from);
$stmt_expenses->execute();
$result_expenses = $stmt_expenses->get_result();

$total_expenses = 0;
$expense_details = [];
$total_budget_entries = 0;

while ($row = $result_expenses->fetch_assoc()) {
    $total_budget_entries++;

    // Calculate overlap days
    $budget_start = strtotime($row['date_start']);
    $budget_end = strtotime($row['date_end']);
    $filter_start = strtotime($date_from);
    $filter_end = strtotime($date_to);

    $overlap_start = max($budget_start, $filter_start);
    $overlap_end = min($budget_end, $filter_end);

    $overlap_days = floor(($overlap_end - $overlap_start) / 86400) + 1;

    // Calculate daily cost
    $total_days = intval($row['total_days']);
    $daily_cost = $total_days > 0 ? floatval($row['budget_allocated']) / $total_days : 0;

    // Calculate proportional expense
    $proportional_expense = $daily_cost * $overlap_days;
    $total_expenses += $proportional_expense;

    $expense_details[] = [
        'budget_id' => $row['budget_id'],
        'expense_name' => $row['expense_name'],
        'budget_allocated' => floatval($row['budget_allocated']),
        'daily_cost' => round($daily_cost, 2),
        'budget_date_start' => $row['date_start'],
        'budget_date_end' => $row['date_end'],
        'overlap_days' => $overlap_days,
        'proportional_expense' => round($proportional_expense, 2)
    ];
}

// ============================================================
// 3. Calculate Net Income
// ============================================================
$net_income = $gross_income - $total_expenses;

// Return results
echo json_encode([
    "success" => true,
    "data" => [
        "date_from" => $date_from,
        "date_to" => $date_to,
        "gross_income" => round($gross_income, 2),
        "total_expenses" => round($total_expenses, 2),
        "net_income" => round($net_income, 2),
        "total_orders" => $total_orders,
        "total_budget_entries" => $total_budget_entries,
        "expense_details" => $expense_details
    ]
]);

$stmt_gross->close();
$stmt_expenses->close();
$conn->close();
