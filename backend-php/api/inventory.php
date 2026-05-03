<?php
require_once __DIR__ . '/../vendor/autoload.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");

use MongoDB\Client;
use MongoDB\BSON\ObjectId;

$client = new Client("mongodb://localhost:27017");
$collection = $client->refillr->merchants;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $merchantId = $input['merchantId'] ?? null;
    if (!$merchantId) {
        echo json_encode(["status" => "error", "message" => "merchantId is required"]);
        exit;
    }

    $updateData = [];
    if (isset($input['pricing'])) {
        $updateData['pricing'] = $input['pricing'];
    }
    if (isset($input['tankSizes'])) {
        $updateData['tankSizes'] = $input['tankSizes'];
    }
    if (isset($input['brandsAccepted'])) {
        $updateData['brandsAccepted'] = $input['brandsAccepted'];
    }

    $updateData['updatedAt'] = new MongoDB\BSON\UTCDateTime();

    try {
        $result = $collection->updateOne(
            ['_id' => new ObjectId($merchantId)],
            ['$set' => $updateData]
        );

        echo json_encode([
            "status" => "success",
            "matched_count" => $result->getMatchedCount(),
            "modified_count" => $result->getModifiedCount()
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
