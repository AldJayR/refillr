<?php
require_once __DIR__ . '/../vendor/autoload.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

use MongoDB\Client;
use MongoDB\BSON\ObjectId;

$client = new Client("mongodb://localhost:27017");
$collection = $client->refillr->orders;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $merchantId = $_GET['merchantId'] ?? null;
    if (!$merchantId) {
        echo json_encode(["status" => "error", "message" => "merchantId is required"]);
        exit;
    }

    // Task 4d & Merchant Analytics Mirror
    $pipeline = [
        ['$match' => ['merchantId' => new ObjectId($merchantId)]],
        ['$facet' => [
            'overview' => [
                ['$group' => [
                    '_id' => null,
                    'totalRevenue' => ['$sum' => '$totalPrice'],
                    'totalOrders' => ['$sum' => 1],
                    'avgOrderValue' => ['$avg' => '$totalPrice']
                ]]
            ],
            'byBrand' => [
                ['$group' => [
                    '_id' => '$tankBrand',
                    'count' => ['$sum' => 1],
                    'revenue' => ['$sum' => '$totalPrice']
                ]]
            ],
            'byStatus' => [
                ['$group' => [
                    '_id' => '$status',
                    'count' => ['$sum' => 1]
                ]]
            ]
        ]]
    ];

    try {
        $result = $collection->aggregate($pipeline);
        $data = iterator_to_array($result)[0];
        echo json_encode(["status" => "success", "data" => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
