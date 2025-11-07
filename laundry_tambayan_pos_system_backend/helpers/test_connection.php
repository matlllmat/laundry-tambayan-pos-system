<!-- this is for testing connection only -->
<?php
include("db_connection.php");

if ($conn) {
    echo "/// Database connection successful!";
} else {
    echo "XXX Database connection failed.";
}
?>