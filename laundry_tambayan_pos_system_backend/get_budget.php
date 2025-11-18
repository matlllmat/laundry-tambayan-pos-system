<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

include("./helpers/check_cors.php");
ob_start();

session_start();
include("./helpers/db_connection.php");

ob_end_clean();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    if (!isset($conn)) {
        throw new Exception("Database connection not available");
    }

    // Get date range from query parameters (default to current month)
    $dateFrom = $_GET['dateFrom'] ?? date('Y-m-01'); // First day of current month
    $dateTo = $_GET['dateTo'] ?? date('Y-m-t');       // Last day of current month

    // Validate dates
    if (!strtotime($dateFrom) || !strtotime($dateTo)) {
        throw new Exception('Invalid date format');
    }

    // Fetch all budget entries
    $query = "SELECT budget_id, expense_name, budget_allocated, date_start, date_end, daily 
              FROM budget 
              ORDER BY budget_id DESC";

    $result = $conn->query($query);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $budgetEntries = [];
    $totalExpenses = 0;

    while ($row = $result->fetch_assoc()) {
        // Calculate proportional expense for the filtered date range
        $budgetStart = new DateTime($row['date_start']);
        $budgetEnd = new DateTime($row['date_end']);
        $filterStart = new DateTime($dateFrom);
        $filterEnd = new DateTime($dateTo);

        // Find overlap period
        $overlapStart = max($budgetStart, $filterStart);
        $overlapEnd = min($budgetEnd, $filterEnd);

        // Calculate days in overlap
        if ($overlapStart <= $overlapEnd) {
            $interval = $overlapStart->diff($overlapEnd);
            $daysInOverlap = $interval->days + 1;
            $proportionalExpense = $row['daily'] * $daysInOverlap;
            $totalExpenses += $proportionalExpense;
        }

        $budgetEntries[] = [
            'budget_id' => (int)$row['budget_id'],
            'expense_name' => $row['expense_name'],
            'budget_allocated' => (float)$row['budget_allocated'],
            'date_start' => $row['date_start'],
            'date_end' => $row['date_end'],
            'daily' => (float)$row['daily']
        ];
    }

    // Calculate gross income from orders created within date range
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as gross_income
        FROM orders
        WHERE DATE(created_at) BETWEEN ? AND ?
    ");
    $stmt->bind_param("ss", $dateFrom, $dateTo);
    $stmt->execute();
    $incomeResult = $stmt->get_result();
    $incomeRow = $incomeResult->fetch_assoc();
    $grossIncome = (float)$incomeRow['gross_income'];
    $stmt->close();

    // Calculate net income
    $netIncome = $grossIncome - $totalExpenses;

    echo json_encode([
        'success' => true,
        'data' => $budgetEntries,
        'totals' => [
            'gross_total' => $grossIncome,
            'total_expenses' => $totalExpenses,
            'net_total' => $netIncome
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

if (isset($conn)) {
    $conn->close();
}
