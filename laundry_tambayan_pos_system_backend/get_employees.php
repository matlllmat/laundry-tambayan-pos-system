<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

// MODIFIED: Added 'salary_daily' to the SELECT
$result = $conn->query("SELECT id, name, email, phone, salary, type, daily_salary FROM employees");

if (!$result) {
    echo json_encode(["success" => false, "message" => "Database query failed: " . $conn->error]);
    exit;
}

$employees = [];
while ($row = $result->fetch_assoc()) {
    $row['salary'] = (float)$row['salary'];
    $row['daily_salary'] = (float)$row['daily_salary']; // Added this line
    $employees[] = $row;
}

echo json_encode(["success" => true, "data" => $employees]);
$conn->close();
?>