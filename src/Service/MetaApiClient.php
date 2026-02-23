<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class MetaApiClient
{
    private string $baseUrl;
    private string $token;
    private HttpClientInterface $httpClient;

    public function __construct(HttpClientInterface $httpClient, string $baseUrl, string $token)
    {
        $this->httpClient = $httpClient;
        $this->baseUrl = $baseUrl;
        $this->token = $token;
    }

    private function request(string $method, string $endpoint, array $data = [])
    {
        $response = $this->httpClient->request($method, $this->baseUrl . $endpoint, [
            'headers' => [
                'Content-Type' => 'application/json',
                'auth-token' => $this->token,
            ],
            'json' => $data,
            'verify_peer' => false,
            'verify_host' => false
        ]);

        $statusCode = $response->getStatusCode();

        if ($statusCode === 204) {
            return true;
        }

        if ($statusCode !== 200) {
            $errorContent = $response->getContent(false);
            throw new \RuntimeException("Failed to request meta api : HTTP $statusCode - $errorContent");
        }

        $responseContent = $response->getContent();
        if (!$responseContent) {
            throw new \RuntimeException('Response body is empty, but status code indicates success.');
        }

        return json_decode($response->getContent());
    }

    public function getAccountInformation(string $accountId): array
    {
        return $this->request('GET', "/users/current/accounts/{$accountId}");
    }

    public function deleteAccount(string $accountId): bool
    {
        $this->baseUrl = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
        return $this->request('POST', "/users/current/accounts/{$accountId}/undeploy");
    }

/*    public function closeAll(string $accountId): bool
    {
        $this->baseUrl = 'https://mt-client-api-v1.london.agiliumtrade.ai';
        return $this->request('POST', "/users/current/accounts/{$accountId}/trade", ['{"actionType": "POSITIONS_CLOSE_SYMBOL","symbol": "GBPUSD"}']);

        // https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/c5083a82-ed5c-4583-b20a-25c2bff34be6/trade
        /*{
            "actionType": "POSITIONS_CLOSE_SYMBOL",
            "symbol": "GBPUSD"
            }
        }
    }*/

    public function closeAll(string $accountId)
    {
        $this->baseUrl = 'https://mt-client-api-v1.london.agiliumtrade.ai';
        try {
            $data = [
                'actionType' => 'POSITIONS_CLOSE_SYMBOL',
                'symbol' => 'GBPUSD'
            ];
            $this->request('POST', "/users/current/accounts/{$accountId}/trade", $data);


            $data = [
                'actionType' => 'POSITIONS_CLOSE_SYMBOL',
                'symbol' => 'EURUSD'
            ];
            $this->request('POST', "/users/current/accounts/{$accountId}/trade", $data);
        } catch (\Exception $e) {
            return false;
        }
        return true;
    }

    public function executeTrade(array $tradeData): array
    {
        return $this->request('POST', '/users/current/accounts/trade', [
            'json' => $tradeData
        ]);
    }

    public function getStrategy(string $strategyId): array
    {
        return $this->request('GET', "/users/current/strategies/{$strategyId}");
    }

    public function updateSubscriber(string $subscriberId, array $data)
    {
        $this->baseUrl = 'https://copyfactory-api-v1.london.agiliumtrade.ai';
        return $this->request('PUT', "/users/current/configuration/subscribers/{$subscriberId}", $data);
    }

    public function getMultiplier(string $subscriberId) : float
    {
        $this->baseUrl = 'https://copyfactory-api-v1.london.agiliumtrade.ai';
        $copyFactory = $this->request('GET', "/users/current/configuration/subscribers/{$subscriberId}");

        if (isset($copyFactory->subscriptions[0]->multiplier)) {
            return $copyFactory->subscriptions[0]->multiplier;
        }

        return 1.0;
    }

    public function getSubscriber(string $subscriberId): array
    {
        $this->baseUrl = 'https://copyfactory-api-v1.london.agiliumtrade.ai';
        $response = $this->request('GET', "/users/current/configuration/subscribers/{$subscriberId}");

        if ($response->getStatusCode() !== 200) {
            throw new \RuntimeException('Failed to fetch subscriber data from MetaApi.');
        }

        return $response->toArray();
    }
}