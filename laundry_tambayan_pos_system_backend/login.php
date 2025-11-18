<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

$data = json_decode(file_get_contents("php://input"));
$email = $data->email ?? '';
$password = $data->password ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Email and password are required"]);
    exit;
}

$sql = "SELECT * FROM employees WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();

    // Use password_verify for hashed passwords
    if (password_verify($password, $row['password'])) {
        $_SESSION['id'] = $row['id'];
        $_SESSION['name'] = $row['name'];
        $_SESSION['email'] = $row['email'];
        $_SESSION['type'] = $row['type'];

        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "user" => [
                "id" => $row['id'],
                "name" => $row['name'],
                "email" => $row['email'],
                "phone" => $row['phone'],
                "salary" => $row['salary'],
                "type" => $row['type']
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid password"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Email not found"]);
}

$stmt->close();
$conn->close();
