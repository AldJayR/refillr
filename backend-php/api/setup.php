<?php
require_once __DIR__ . '/../vendor/autoload.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

use MongoDB\Client;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

$client = new Client("mongodb://localhost:27017");
$db = $client->refillr;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? 'seed';

    try {
        if ($action === 'create_collections') {
            // Task 4b: Create Database/Collections
            $db->createCollection("users");
            $db->createCollection("merchants");
            $db->createCollection("orders");
            echo json_encode(["status" => "success", "message" => "Collections created"]);
        } 
        elseif ($action === 'drop_database') {
            // Task 4b: Delete Database
            $db->drop();
            echo json_encode(["status" => "success", "message" => "Database dropped"]);
        }
        elseif ($action === 'seed') {
            // Task 5d: Insert 10 documents per collection
            
            // 1. Users
            $users = [];
            for($i=1; $i<=10; $i++) {
                $users[] = [
                    'clerkId' => "user_php_$i",
                    'email' => "test$i@php.refillr.ph",
                    'role' => $i === 1 ? 'merchant' : 'customer',
                    'createdAt' => new UTCDateTime()
                ];
            }
            $db->users->insertMany($users);

            // 2. Merchants
            $merchants = [];
            for($i=1; $i<=10; $i++) {
                $merchants[] = [
                    'ownerUserId' => "user_php_$i",
                    'shopName' => "PHP Gas Hub $i",
                    'location' => [
                        'type' => 'Point',
                        'coordinates' => [120.9734 + ($i * 0.001), 15.4868 + ($i * 0.001)]
                    ],
                    'pricing' => ['Gasul-11kg' => 850 + $i],
                    'isVerified' => true,
                    'createdAt' => new UTCDateTime()
                ];
            }
            $db->merchants->insertMany($merchants);

            // 3. Orders
            $orders = [];
            for($i=1; $i<=10; $i++) {
                $orders[] = [
                    'userId' => "user_php_10", // Created by the 10th test user
                    'merchantId' => new ObjectId(), // Dummy ID for simulation
                    'tankBrand' => 'Gasul',
                    'tankSize' => '11kg',
                    'totalPrice' => 850.00,
                    'status' => 'pending',
                    'createdAt' => new UTCDateTime()
                ];
            }
            $db->orders->insertMany($orders);

            echo json_encode(["status" => "success", "message" => "10 documents inserted into 3 collections"]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
