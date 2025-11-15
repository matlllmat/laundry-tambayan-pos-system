<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

$ADMIN_PASSWORD = 'admin123'; 
$data = json_decode(file_get_contents("php://input"));

// 1. Authenticate
if (empty($data->authPassword)) {
    echo json_encode(["success" => false, "message" => "Authentication password is required."]);
    exit;
}
if ($data->authPassword !== $ADMIN_PASSWORD) {
    echo json_encode(["success" => false, "message" => "Authentication failed. Invalid password."]);
    exit;
}
if (empty($data->action)) {
    echo json_encode(["success" => false, "message" => "No action specified."]);
    exit;
}

$action = $data->action;

switch ($action) {
    case 'delete':
        if (empty($data->transactionId)) {
            echo json_encode(["success" => false, "message" => "Transaction ID is required for deletion."]);
            exit;
        }

        $transaction_id = (int)$data->transactionId;

        // Thanks to ON DELETE CASCADE, this will also delete all items from 'order_items'
        $stmt = $conn->prepare("DELETE FROM orders WHERE order_id = ?");
        $stmt->bind_param("i", $transaction_id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Transaction deleted successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Transaction not found or already deleted."]);
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