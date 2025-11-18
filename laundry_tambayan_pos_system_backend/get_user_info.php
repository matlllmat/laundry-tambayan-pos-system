<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$user_id = $_SESSION['id'];

// Fetch user information
$sql = "SELECT id, name, email, phone, type FROM employees WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo json_encode([
        "success" => true,
        "user" => $user
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
}

$stmt->close();
$conn->close();
