<?php
include("./helpers/check_cors.php");
include("./helpers/db_connection.php");

$ADMIN_PASSWORD = 'admin123'; 

// Get the posted JSON data
$data = json_decode(file_get_contents("php://input"));

// 1. Universal Authentication Check
if (empty($data->authPassword)) {
    echo json_encode(["success" => false, "message" => "Authentication password is required."]);
    exit;
}
if ($data->authPassword !== $ADMIN_PASSWORD) {
    echo json_encode(["success" => false, "message" => "Authentication failed."]);
    exit;
}

// 2. Route based on the 'action' parameter
if (empty($data->action)) {
    echo json_encode(["success" => false, "message" => "No action specified."]);
    exit;
}

$action = $data->action;

switch ($action) {
    // ==========================================================
    // CASE 1: ADD NEW ITEM
    // ==========================================================
    case 'add':
        // Validation for 'add'
        if (empty($data->itemName) || empty($data->itemType) || !isset($data->price)) {
            echo json_encode(["success" => false, "message" => "Missing fields for adding item."]);
            exit;
        }
        $priceNum = floatval($data->price);
        if ($priceNum <= 0) {
            echo json_encode(["success" => false, "message" => "Price must be a positive number."]);
            exit;
        }

        // Prepare and execute
        $stmt = $conn->prepare("INSERT INTO items (item_name, item_type, item_price) VALUES (?, ?, ?)");
        $stmt->bind_param("ssd", $data->itemName, $data->itemType, $priceNum);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Item added successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Add query failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    // ==========================================================
    // CASE 2: UPDATE EXISTING ITEM
    // ==========================================================
    case 'update':
        // Validation for 'update'
        if (empty($data->itemId) || empty($data->itemName) || empty($data->itemType) || !isset($data->price)) {
            echo json_encode(["success" => false, "message" => "Missing fields for updating item."]);
            exit;
        }
        $priceNum = floatval($data->price);
        if ($priceNum <= 0) {
            echo json_encode(["success" => false, "message" => "Price must be a positive number."]);
            exit;
        }

        // Prepare and execute
        $stmt = $conn->prepare("UPDATE items SET item_name = ?, item_type = ?, item_price = ? WHERE item_id = ?");
        $stmt->bind_param("ssdi", $data->itemName, $data->itemType, $priceNum, $data->itemId);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Item updated successfully."]);
            } else {
                echo json_encode(["success" => true, "message" => "No changes were made to the item."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Update query failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    // ==========================================================
    // CASE 3: DELETE ITEM
    // ==========================================================
    case 'delete':
        // Validation for 'delete'
        if (empty($data->itemId)) {
            echo json_encode(["success" => false, "message" => "Item ID is required for deletion."]);
            exit;
        }

        // Prepare and execute
        $stmt = $conn->prepare("DELETE FROM items WHERE item_id = ?");
        $stmt->bind_param("i", $data->itemId);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Item deleted successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Item not found or already deleted."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Delete query failed: " . $stmt->error]);
        }
        $stmt->close();
        break;

    // ==========================================================
    // DEFAULT: INVALID ACTION
    // ==========================================================
    default:
        echo json_encode(["success" => false, "message" => "Invalid action specified."]);
        break;
}

$conn->close();
?>