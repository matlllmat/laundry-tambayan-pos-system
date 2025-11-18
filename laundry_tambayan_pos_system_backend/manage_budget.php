<?php
// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

include("./helpers/check_cors.php");

// Start output buffering to catch any unexpected output
ob_start();

session_start();
include("./helpers/db_connection.php");

// Clear any unexpected output
ob_end_clean();

// Set JSON header
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Check if connection exists
    if (!isset($conn)) {
        throw new Exception("Database connection not available");
    }

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    $action = $input['action'] ?? '';
    $authPassword = $input['authPassword'] ?? '';

    // Verify authentication password (checking against admin users)
    if (empty($authPassword)) {
        echo json_encode([
            'success' => false,
            'message' => 'Authentication password is required'
        ]);
        exit;
    }

    // Check if password matches any admin user
    $stmt = $conn->prepare("SELECT id, password FROM employees WHERE type = 'admin'");
    $stmt->execute();
    $result = $stmt->get_result();

    $admin = null;
    while ($row = $result->fetch_assoc()) {
        // Check if password is hashed or plain text
        if (password_verify($authPassword, $row['password'])) {
            // Hashed password match
            $admin = $row;
            break;
        } elseif ($authPassword === $row['password']) {
            // Plain text password match
            $admin = $row;
            break;
        }
    }
    $stmt->close();

    if (!$admin) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid authentication password'
        ]);
        exit;
    }

    // Handle different actions
    switch ($action) {
        case 'add':
            $expenseName = $input['expenseName'] ?? '';
            $budgetAllocated = $input['budgetAllocated'] ?? 0;
            $dateFrom = $input['dateFrom'] ?? '';
            $dateTo = $input['dateTo'] ?? '';

            if (empty($expenseName) || $budgetAllocated <= 0 || empty($dateFrom) || empty($dateTo)) {
                throw new Exception('All fields are required and budget must be greater than 0');
            }

            // Calculate daily expense
            $dateStart = new DateTime($dateFrom);
            $dateEnd = new DateTime($dateTo);
            $interval = $dateStart->diff($dateEnd);
            $days = $interval->days + 1; // Include both start and end dates

            if ($days <= 0) {
                throw new Exception('Invalid date range');
            }

            $daily = $budgetAllocated / $days;

            // Insert new budget entry
            $stmt = $conn->prepare("
                INSERT INTO budget (expense_name, budget_allocated, daily, date_start, date_end)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("sddss", $expenseName, $budgetAllocated, $daily, $dateFrom, $dateTo);

            if (!$stmt->execute()) {
                throw new Exception("Failed to add budget entry: " . $stmt->error);
            }
            $stmt->close();

            echo json_encode([
                'success' => true,
                'message' => 'Budget entry added successfully'
            ]);
            break;

        case 'update':
            $budgetId = $input['budgetId'] ?? null;
            $expenseName = $input['expenseName'] ?? '';
            $budgetAllocated = $input['budgetAllocated'] ?? 0;
            $dateFrom = $input['dateFrom'] ?? '';
            $dateTo = $input['dateTo'] ?? '';

            if (!$budgetId || empty($expenseName) || $budgetAllocated <= 0 || empty($dateFrom) || empty($dateTo)) {
                throw new Exception('All fields are required and budget must be greater than 0');
            }

            // Calculate daily expense
            $dateStart = new DateTime($dateFrom);
            $dateEnd = new DateTime($dateTo);
            $interval = $dateStart->diff($dateEnd);
            $days = $interval->days + 1;

            if ($days <= 0) {
                throw new Exception('Invalid date range');
            }

            $daily = $budgetAllocated / $days;

            // Update budget entry
            $stmt = $conn->prepare("
                UPDATE budget 
                SET expense_name = ?, 
                    budget_allocated = ?, 
                    daily = ?, 
                    date_start = ?, 
                    date_end = ?
                WHERE budget_id = ?
            ");
            $stmt->bind_param("sddssi", $expenseName, $budgetAllocated, $daily, $dateFrom, $dateTo, $budgetId);

            if (!$stmt->execute()) {
                throw new Exception("Failed to update budget entry: " . $stmt->error);
            }
            $stmt->close();

            echo json_encode([
                'success' => true,
                'message' => 'Budget entry updated successfully'
            ]);
            break;

        case 'delete':
            $budgetId = $input['budgetId'] ?? null;

            if (!$budgetId) {
                throw new Exception('Budget ID is required');
            }

            // Delete budget entry
            $stmt = $conn->prepare("DELETE FROM budget WHERE budget_id = ?");
            $stmt->bind_param("i", $budgetId);

            if (!$stmt->execute()) {
                throw new Exception("Failed to delete budget entry: " . $stmt->error);
            }
            $stmt->close();

            echo json_encode([
                'success' => true,
                'message' => 'Budget entry deleted successfully'
            ]);
            break;

        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

// Close connection
if (isset($conn)) {
    $conn->close();
}
