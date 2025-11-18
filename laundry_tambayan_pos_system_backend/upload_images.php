<?php
include("./helpers/check_cors.php");

session_start();
include("./helpers/db_connection.php");

// Check if user is logged in and is admin
if (!isset($_SESSION['id']) || $_SESSION['type'] !== 'admin') {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized access. Admin privileges required."
    ]);
    exit;
}

// Define upload directory (relative to backend root)
$upload_dir = "../src/assets/";

// Create directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$errors = [];
$uploaded_files = [];

// Handle favicon upload
if (isset($_FILES['favicon']) && $_FILES['favicon']['error'] === UPLOAD_ERR_OK) {
    $favicon = $_FILES['favicon'];
    $old_favicon = $_POST['old_favicon'] ?? '';
    
    // Validate file type
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!in_array($favicon['type'], $allowed_types)) {
        $errors[] = "Favicon must be an image file (JPEG, PNG, GIF, WebP, SVG)";
    } else {
        // Generate unique filename
        $extension = pathinfo($favicon['name'], PATHINFO_EXTENSION);
        $new_filename = 'favicon_' . time() . '.' . $extension;
        $target_path = $upload_dir . $new_filename;
        
        // Move uploaded file
        if (move_uploaded_file($favicon['tmp_name'], $target_path)) {
            // Delete old favicon if it's not the default
            if (!empty($old_favicon) && 
                $old_favicon !== '/src/assets/default_logo.png' && 
                file_exists($upload_dir . basename($old_favicon))) {
                unlink($upload_dir . basename($old_favicon));
            }
            
            // Update database
            $new_path = '/src/assets/' . $new_filename;
            $sql = "UPDATE settings SET setting_value = ? WHERE setting_name = 'favicon_logo'";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $new_path);
            
            if ($stmt->execute()) {
                $uploaded_files['favicon'] = $new_filename;
            } else {
                $errors[] = "Failed to update favicon in database";
            }
            
            $stmt->close();
        } else {
            $errors[] = "Failed to upload favicon";
        }
    }
}

// Handle background upload
if (isset($_FILES['background']) && $_FILES['background']['error'] === UPLOAD_ERR_OK) {
    $background = $_FILES['background'];
    $old_background = $_POST['old_background'] ?? '';
    
    // Validate file type
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($background['type'], $allowed_types)) {
        $errors[] = "Background must be an image file (JPEG, PNG, GIF, WebP)";
    } else {
        // Generate unique filename
        $extension = pathinfo($background['name'], PATHINFO_EXTENSION);
        $new_filename = 'background_' . time() . '.' . $extension;
        $target_path = $upload_dir . $new_filename;
        
        // Move uploaded file
        if (move_uploaded_file($background['tmp_name'], $target_path)) {
            // Delete old background if it's not the default
            if (!empty($old_background) && 
                $old_background !== '/src/assets/default_background.png' && 
                file_exists($upload_dir . basename($old_background))) {
                unlink($upload_dir . basename($old_background));
            }
            
            // Update database
            $new_path = '/src/assets/' . $new_filename;
            $sql = "UPDATE settings SET setting_value = ? WHERE setting_name = 'bacground_image'";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $new_path);
            
            if ($stmt->execute()) {
                $uploaded_files['background'] = $new_filename;
            } else {
                $errors[] = "Failed to update background in database";
            }
            
            $stmt->close();
        } else {
            $errors[] = "Failed to upload background";
        }
    }
}

$conn->close();

// Return response
if (empty($errors)) {
    echo json_encode([
        "success" => true,
        "message" => "Images uploaded successfully",
        "uploaded_files" => $uploaded_files
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => implode(", ", $errors)
    ]);
}