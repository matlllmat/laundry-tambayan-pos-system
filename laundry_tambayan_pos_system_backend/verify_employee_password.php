<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated. Please log in."
    ]);
    exit;
}

// Get the password from request
$data = json_decode(file_get_contents("php://input"), true);
$password = $data['password'] ?? '';

if (empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password is required."
    ]);
    exit;
}

// Get the logged-in employee's ID from session
$employee_id = $_SESSION['id'];

// Fetch employee password from database
$sql = "SELECT password FROM employees WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $employee_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();

    // Use password_verify() to compare against hashed password
    if (password_verify($password, $row['password'])) {
        echo json_encode([
            "success" => true,
            "message" => "Password verified successfully."
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Incorrect password."
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Employee not found."
    ]);
}

$stmt->close();
$conn->close();
