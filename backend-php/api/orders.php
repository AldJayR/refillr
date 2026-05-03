<?php
require_once __DIR__ . '/../vendor/autoload.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

use MongoDB\Client;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

$client = new Client("mongodb://localhost:27017");
$collection = $client->refillr->orders;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Read JSON or Form Data
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    // Map input to the Typegoose Order schema
    $new_order = [
        'userId' => $input['userId'] ?? 'user_anonymous',
        'merchantId' => new ObjectId($input['merchantId'] ?? '000000000000000000000000'),
        'tankBrand' => $input['tankBrand'] ?? 'Gasul',
        'tankSize' => $input['tankSize'] ?? '11kg',
        'quantity' => isset($input['quantity']) ? (int)$input['quantity'] : 1,
        'totalPrice' => isset($input['totalPrice']) ? (float)$input['totalPrice'] : 850.00,
        'status' => 'pending',
        'deliveryLocation' => [
            'type' => 'Point',
            'coordinates' => [
                isset($input['lng']) ? (float)$input['lng'] : 120.9734,
                isset($input['lat']) ? (float)$input['lat'] : 15.4868
            ]
        ],
        'deliveryAddress' => $input['deliveryAddress'] ?? 'Cabanatuan City, NE',
        'createdAt' => new UTCDateTime(),
        'updatedAt' => new UTCDateTime()
    ];
    
    try {
        $result = $collection->insertOne($new_order);
        echo json_encode([
            "status" => "success", 
            "message" => "Order created successfully",
            "inserted_id" => (string)$result->getInsertedId()
        ]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch orders, optionally filter by userId
    $userId = $_GET['userId'] ?? null;
    $filter = [];
    if ($userId) {
        $filter['userId'] = $userId;
    }
    
    $options = [
        'sort' => ['createdAt' => -1],
        'limit' => 50
    ];
    
    try {
        $orders = $collection->find($filter, $options);
        $data = [];
        foreach ($orders as $order) {
            $data[] = $order;
        }
        echo json_encode(["status" => "success", "data" => $data]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
