<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");


$result = $conn->query("SELECT setting_name, setting_value FROM settings");

$settings = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $settings[] = $row;
    }
}

echo json_encode([
    "success" => true,
    "settings" => $settings
]);

$conn->close();
