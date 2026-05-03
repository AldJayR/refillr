<?php
require_once __DIR__ . '/../vendor/autoload.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

use MongoDB\Client;

$client = new Client("mongodb://localhost:27017");
$collection = $client->refillr->merchants;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Geolocation search for Refillr Merchants
    $lat = isset($_GET['lat']) ? (float)$_GET['lat'] : 15.4868;
    $lng = isset($_GET['lng']) ? (float)$_GET['lng'] : 120.9734;
    $radius = isset($_GET['radius']) ? (int)$_GET['radius'] : 5000;

    $filter = [
        'location' => [
            '$nearSphere' => [
                '$geometry' => [
                    'type' => 'Point',
                    'coordinates' => [$lng, $lat]
                ],
                '$maxDistance' => $radius
            ]
        ]
    ];

    try {
        $merchants = $collection->find($filter);
        $data = [];
        foreach ($merchants as $merchant) {
            $data[] = $merchant;
        }
        echo json_encode(["status" => "success", "data" => $data]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
