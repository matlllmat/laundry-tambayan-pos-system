<?php
$host = "localhost";
$user = "root";
$pass = ""; // ? password nothing yet 
$dbname = "laundry_tambayan_pos_system";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]));
}
