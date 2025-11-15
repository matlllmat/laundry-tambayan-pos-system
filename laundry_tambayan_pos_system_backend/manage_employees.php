<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

$ADMIN_PASSWORD = 'admin123'; 

$data = json_decode(file_get_contents("php://input"));

// 1. Universal Authentication Check (no change)
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

// --- Helper function to calculate 'daily_salary' ---
function calculate_daily_salary($monthly_salary) {
    if ($monthly_salary <= 0) {
        return 0;
    }
    // 't' gets the number of days in the current month
    $days_in_month = (int)date('t');
    
    if ($days_in_month > 0) {
        return round($monthly_salary / $days_in_month, 2);
    }
    return 0;
}
// ---------------------------------------------------

switch ($action) {
    case 'add':
        // Validation (no change)
        if (empty($data->name) || empty($data->email) || empty($data->phone) || !isset($data->salary) || empty($data->password) || empty($data->type)) {
            echo json_encode(["success" => false, "message" => "All fields are required."]);
            exit;
        }
        if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
             echo json_encode(["success" => false, "message" => "Invalid email format."]);
            exit;
        }
        $salaryNum = floatval($data->salary);
        if ($salaryNum < 0) {
            echo json_encode(["success" => false, "message" => "Salary must be a positive number."]);
            exit;
        }

        $plain_text_password = $data->password;
        
        // MODIFIED: Calculate daily salary
        $daily_salary = calculate_daily_salary($salaryNum);

        // MODIFIED: Added 'daily_salary' to INSERT
        $stmt = $conn->prepare("INSERT INTO employees (name, email, phone, password, salary, daily_salary, type) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssdds", $data->name, $data->email, $data->phone, $plain_text_password, $salaryNum, $daily_salary, $data->type);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Employee added successfully."]);
        } else {
            if ($conn->errno == 1062) {
                 echo json_encode(["success" => false, "message" => "This email address is already in use."]);
            } else {
                 echo json_encode(["success" => false, "message" => "Add query failed: " . $stmt->error]);
            }
        }
        $stmt->close();
        break;

    case 'update':
        // Validation (no change)
        if (empty($data->employeeId) || empty($data->name) || empty($data->email) || empty($data->phone) || !isset($data->salary) || empty($data->type)) {
            echo json_encode(["success" => false, "message" => "Missing fields for updating employee."]);
            exit;
        }
         $salaryNum = floatval($data->salary);
         if ($salaryNum < 0) {
            echo json_encode(["success" => false, "message" => "Salary must be a positive number."]);
            exit;
        }

        // MODIFIED: Calculate daily salary
        $daily_salary = calculate_daily_salary($salaryNum);
        
        // --- Password Update Logic ---
        if (!empty($data->password)) {
            $plain_text_password = $data->password;
            
            // MODIFIED: Added 'daily_salary' to UPDATE
            $stmt = $conn->prepare("UPDATE employees SET name = ?, email = ?, phone = ?, salary = ?, daily_salary = ?, type = ?, password = ? WHERE id = ?");
            $stmt->bind_param("sssddssi", $data->name, $data->email, $data->phone, $salaryNum, $daily_salary, $data->type, $plain_text_password, $data->employeeId);

        } else {
            // No new password was entered
            // MODIFIED: Added 'daily_salary' to UPDATE
            $stmt = $conn->prepare("UPDATE employees SET name = ?, email = ?, phone = ?, salary = ?, daily_salary = ?, type = ? WHERE id = ?");
            $stmt->bind_param("sssddsi", $data->name, $data->email, $data->phone, $salaryNum, $daily_salary, $data->type, $data->employeeId);
        }
        // -----------------------------

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Employee updated successfully."]);
            } else {
                echo json_encode(["success" => true, "message" => "No changes were made."]);
            }
        } else {
             if ($conn->errno == 1062) {
                 echo json_encode(["success" => false, "message" => "This email address is already in use by another employee."]);
            } else {
                 echo json_encode(["success" => false, "message" => "Update query failed: " . $stmt->error]);
            }
        }
        $stmt->close();
        break;

    case 'delete':
        // No change
        if (empty($data->employeeId)) {
            echo json_encode(["success" => false, "message" => "Employee ID is required for deletion."]);
            exit;
        }
        $stmt = $conn->prepare("DELETE FROM employees WHERE id = ?");
        $stmt->bind_param("i", $data->employeeId);
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Employee deleted successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Employee not found."]);
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