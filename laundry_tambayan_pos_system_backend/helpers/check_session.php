<?php
include("check_cors.php");
session_start();

if (isset($_SESSION['id'])) {
    echo json_encode([
        "logged_in" => true,
        "user" => [
            "id" => $_SESSION['id'],
            "name" => $_SESSION['name'],
            "email" => $_SESSION['email'],
            "type" => $_SESSION['type']
        ]
    ]);
} else {
    echo json_encode(["logged_in" => false]);
}
