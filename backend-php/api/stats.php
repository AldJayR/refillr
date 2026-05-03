<?php
require_once __DIR__ . '/../vendor/autoload.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

use MongoDB\Client;

$client = new Client("mongodb://localhost:27017");
$collection = $client->refillr->orders;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Task 4d: Aggregate Functions Implementation in PHP (High-level Library)
    
    $pipeline = [
        [
            // Group by tankBrand to calculate stats
            '$group' => [
                '_id' => '$tankBrand',
                'totalCount' => ['$sum' => 1],
                'averagePrice' => ['$avg' => '$totalPrice'],
                'minPrice' => ['$min' => '$totalPrice'],
                'maxPrice' => ['$max' => '$totalPrice']
            ]
        ]
    ];

    try {
        $stats = $collection->aggregate($pipeline);
        $data = [];
        foreach ($stats as $document) {
            $data[] = $document;
        }
        echo json_encode(["status" => "success", "data" => $data]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
