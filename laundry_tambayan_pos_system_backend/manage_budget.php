<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

$ADMIN_PASSWORD = 'admin123'; 

$data = json_decode(file_get_contents("php://input"));

// 1. Universal Authentication Check
if (empty($data->authPassword)) {
    echo json_encode(["success" => false, "message" => "Authentication password is required."]);
    exit;
}
if ($data->authPassword !== $ADMIN_PASSWORD) {
    echo json_encode(["success" => false, "message" => "Authentication failed."]);
    exit;
}
if (empty($data->action)) {
    echo json_encode(["success" => false, "message" => "No action specified."]);
    exit;
}

$action = $data->action;

// --- Helper function to calculate 'daily' amount ---
function calculate_daily($budget, $dateFrom, $dateTo) {
    if (empty($dateFrom) || empty($dateTo) || $budget <= 0) {
        return 0;
    }
    try {
        $start = new DateTime($dateFrom);
        $end = new DateTime($dateTo);
        // Add 1 to include both the start and end date
        $days = $end->diff($start)->days + 1;

        if ($days <= 0) {
            return 0;
        }
        return round($budget / $days, 2);

    } catch (Exception $e) {
        return 0;
    }
}
// ----------------------------------------------------


switch ($action) {
    case 'add':
        if (empty($data->expenseName) || !isset($data->budgetAllocated) || empty($data->dateFrom) || empty($data->dateTo)) {
            echo json_encode(["success" => false, "message" => "All fields are required."]);
            exit;
        }
        $budgetAllocatedNum = floatval($data->budgetAllocated);
        if ($budgetAllocatedNum <= 0) {
            echo json_encode(["success" => false, "message" => "Budget Allocated must be greater than 0."]);
            exit;
        }
         if ($data->dateTo < $data->dateFrom) {
            echo json_encode(["success" => false, "message" => "The 'To' date must be after the 'From' date."]);
            exit;
        }

        // Calculate 'daily'
        $daily_amount = calculate_daily($budgetAllocatedNum, $data->dateFrom, $data->dateTo);

        // INSERT (no expense_cost)
        $stmt = $conn->prepare("INSERT INTO budget (expense_name, budget_allocated, date_start, date_end, daily) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sdssd", $data->expenseName, $budgetAllocatedNum, $data->dateFrom, $data->dateTo, $daily_amount);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Budget entry added successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Add query failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'update':
        if (empty($data->budgetId) || empty($data->expenseName) || !isset($data->budgetAllocated) || empty($data->dateFrom) || empty($data->dateTo)) {
            echo json_encode(["success" => false, "message" => "All fields are required."]);
            exit;
        }
        $budgetAllocatedNum = floatval($data->budgetAllocated);
         if ($budgetAllocatedNum <= 0) {
            echo json_encode(["success" => false, "message" => "Budget Allocated must be greater than 0."]);
            exit;
        }
        if ($data->dateTo < $data->dateFrom) {
            echo json_encode(["success" => false, "message" => "The 'To' date must be after the 'From' date."]);
            exit;
        }

        // Calculate 'daily'
        $daily_amount = calculate_daily($budgetAllocatedNum, $data->dateFrom, $data->dateTo);

        // UPDATE (no expense_cost)
        $stmt = $conn->prepare("UPDATE budget SET expense_name = ?, budget_allocated = ?, date_start = ?, date_end = ?, daily = ? WHERE budget_id = ?");
        $stmt->bind_param("sdssdi", $data->expenseName, $budgetAllocatedNum, $data->dateFrom, $data->dateTo, $daily_amount, $data->budgetId);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Budget entry updated successfully."]);
            } else {
                echo json_encode(["success" => true, "message" => "No changes were made."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Update query failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'delete':
        if (empty($data->budgetId)) {
            echo json_encode(["success" => false, "message" => "Budget ID is required for deletion."]);
            exit;
        }
        $stmt = $conn->prepare("DELETE FROM budget WHERE budget_id = ?");
        $stmt->bind_param("i", $data->budgetId);
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Budget entry deleted successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Entry not found."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Delete query failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    default:
        echo json_encode(["success" => false, "message" => "Invalid action specified."]);
        break;
}

$conn->close();
?>