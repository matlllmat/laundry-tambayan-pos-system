<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

session_start();

$data = json_decode(file_get_contents("php://input"));

// 1. Check if user is logged in
if (!isset($_SESSION['id']) || !isset($_SESSION['email'])) {
    echo json_encode(["success" => false, "message" => "User not logged in."]);
    exit;
}

// 2. Authentication Check - verify against logged-in user's password
if (empty($data->authPassword)) {
    echo json_encode(["success" => false, "message" => "Authentication password is required."]);
    exit;
}

// Get the logged-in user's password from database
$stmt = $conn->prepare("SELECT password FROM employees WHERE id = ?");
$stmt->bind_param("i", $_SESSION['id']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "User session invalid."]);
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

// Verify the authentication password
if (!password_verify($data->authPassword, $user['password'])) {
    echo json_encode(["success" => false, "message" => "Authentication failed. Incorrect password."]);
    exit;
}

if (empty($data->action)) {
    echo json_encode(["success" => false, "message" => "No action specified."]);
    exit;
}

$action = $data->action;

// --- Helper function to calculate 'daily_salary' ---
function calculate_daily_salary($monthly_salary)
{
    if ($monthly_salary <= 0) {
        return 0;
    }
    $days_in_month = (int)date('t');

    if ($days_in_month > 0) {
        return round($monthly_salary / $days_in_month, 2);
    }
    return 0;
}
// ---------------------------------------------------

switch ($action) {
    case 'add':
        // Validation
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

        // Hash the password
        $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);

        // Calculate daily salary
        $daily_salary = calculate_daily_salary($salaryNum);

        // Insert with hashed password
        $stmt = $conn->prepare("INSERT INTO employees (name, email, phone, password, salary, daily_salary, type) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssdds", $data->name, $data->email, $data->phone, $hashed_password, $salaryNum, $daily_salary, $data->type);

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
        // Validation
        if (empty($data->employeeId) || empty($data->name) || empty($data->email) || empty($data->phone) || !isset($data->salary) || empty($data->type)) {
            echo json_encode(["success" => false, "message" => "Missing fields for updating employee."]);
            exit;
        }
        $salaryNum = floatval($data->salary);
        if ($salaryNum < 0) {
            echo json_encode(["success" => false, "message" => "Salary must be a positive number."]);
            exit;
        }

        // Calculate daily salary
        $daily_salary = calculate_daily_salary($salaryNum);

        // Password Update Logic
        if (!empty($data->password)) {
            // Hash the new password
            $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);

            $stmt = $conn->prepare("UPDATE employees SET name = ?, email = ?, phone = ?, salary = ?, daily_salary = ?, type = ?, password = ? WHERE id = ?");
            $stmt->bind_param("sssddssi", $data->name, $data->email, $data->phone, $salaryNum, $daily_salary, $data->type, $hashed_password, $data->employeeId);
        } else {
            // No new password - keep the old one
            $stmt = $conn->prepare("UPDATE employees SET name = ?, email = ?, phone = ?, salary = ?, daily_salary = ?, type = ? WHERE id = ?");
            $stmt->bind_param("sssddsi", $data->name, $data->email, $data->phone, $salaryNum, $daily_salary, $data->type, $data->employeeId);
        }

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
