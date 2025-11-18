<?php
include("./helpers/check_cors.php");
session_start();
include("./helpers/db_connection.php");
header('Content-Type: application/json');

// ============================================================
// FILE 5: delete_snapshot.php
// Deletes a snapshot (requires password verification)
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
$snapshot_id = $data['snapshot_id'] ?? 0;
$password = $data['password'] ?? '';

if (empty($snapshot_id) || empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Snapshot ID and password are required."
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

// Delete snapshot (cascade will delete expense details automatically)
$sql_delete = "DELETE FROM income_report_snapshots WHERE snapshot_id = ?";
$stmt_delete = $conn->prepare($sql_delete);
$stmt_delete->bind_param("i", $snapshot_id);

if ($stmt_delete->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Snapshot deleted successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to delete snapshot."
    ]);
}

$stmt_delete->close();
$conn->close();
