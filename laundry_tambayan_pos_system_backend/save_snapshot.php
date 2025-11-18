<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");
header('Content-Type: application/json');

// ============================================================
// FILE 2: save_snapshot.php
// Saves a calculated report as a snapshot
// ============================================================
// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated. Please log in."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$report_name = $data['report_name'] ?? '';
$date_from = $data['date_from'] ?? '';
$date_to = $data['date_to'] ?? '';
$gross_income = $data['gross_income'] ?? 0;
$total_expenses = $data['total_expenses'] ?? 0;
$net_income = $data['net_income'] ?? 0;
$total_orders = $data['total_orders'] ?? 0;
$total_budget_entries = $data['total_budget_entries'] ?? 0;
$notes = $data['notes'] ?? '';
$password = $data['password'] ?? '';
$expense_details = $data['expense_details'] ?? [];

// Validate required fields
if (empty($report_name) || empty($date_from) || empty($date_to) || empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Report name, date range, and password are required."
    ]);
    exit;
}

// Verify password
$employee_id = $_SESSION['id'];
$sql_verify = "SELECT password FROM employees WHERE id = ?";
$stmt_verify = $conn->prepare($sql_verify);
$stmt_verify->bind_param("i", $employee_id);
$stmt_verify->execute();
$result_verify = $stmt_verify->get_result();

if ($result_verify->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Employee not found."
    ]);
    exit;
}

$row = $result_verify->fetch_assoc();
if (!password_verify($password, $row['password'])) {
    echo json_encode([
        "success" => false,
        "message" => "Incorrect password."
    ]);
    exit;
}
$stmt_verify->close();

// Start transaction
$conn->begin_transaction();

try {
    // Insert into income_report_snapshots
    $sql_snapshot = "INSERT INTO income_report_snapshots 
        (report_name, date_from, date_to, gross_income, total_expenses, net_income, 
         total_orders, total_budget_entries, created_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt_snapshot = $conn->prepare($sql_snapshot);
    $stmt_snapshot->bind_param(
        "sssdddiiis",
        $report_name,
        $date_from,
        $date_to,
        $gross_income,
        $total_expenses,
        $net_income,
        $total_orders,
        $total_budget_entries,
        $employee_id,
        $notes
    );
    $stmt_snapshot->execute();
    $snapshot_id = $conn->insert_id;
    $stmt_snapshot->close();

    // Insert expense details
    if (!empty($expense_details)) {
        $sql_detail = "INSERT INTO snapshot_expense_details 
            (snapshot_id, budget_id, expense_name, budget_allocated, daily_cost, 
             budget_date_start, budget_date_end, overlap_days, proportional_expense)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt_detail = $conn->prepare($sql_detail);

        foreach ($expense_details as $detail) {
            $stmt_detail->bind_param(
                "iisddssid",
                $snapshot_id,
                $detail['budget_id'],
                $detail['expense_name'],
                $detail['budget_allocated'],
                $detail['daily_cost'],
                $detail['budget_date_start'],
                $detail['budget_date_end'],
                $detail['overlap_days'],
                $detail['proportional_expense']
            );
            $stmt_detail->execute();
        }
        $stmt_detail->close();
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Snapshot saved successfully.",
        "snapshot_id" => $snapshot_id
    ]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        "success" => false,
        "message" => "Failed to save snapshot: " . $e->getMessage()
    ]);
}

$conn->close();
