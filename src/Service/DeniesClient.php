<?php

namespace App\Service;

use App\Entity\Account;
use App\Entity\Agent;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class DeniesClient
{
    private string $baseUrl;
    private string $username;
    private string $token;
    private HttpClientInterface $httpClient;

    public function __construct(HttpClientInterface $httpClient, string $baseUrl = "")
    {
        $this->httpClient = $httpClient;
        $this->baseUrl = "http://65.108.60.88:5021/api/trader/";
    }

    private function request(string $method, string $endpoint, array $data = [])
    {
        $response = $this->httpClient->request($method, $this->baseUrl . $endpoint, [
            'headers' => [
                'Accept' => '*/*',
                'Content-Type' => 'application/json',
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

/*            var_dump("$this->baseUrl . $endpoint");
            var_dump("<pre>");
            var_dump($response); die;*/

            $errorContent = $response->getContent(false);
            throw new \RuntimeException("Failed to request host api: HTTP $statusCode - $errorContent - Data: " . http_build_query($data));
        }

        $responseContent = $response->getContent();
        if (!$responseContent) {
            throw new \RuntimeException('Response body is empty, but status code indicates success.');
        }

        return json_decode($response->getContent());
    }

    public function addAccount(Account $account)
    {
        $decryptedPassword = $this->decryptPassword($account->getPassword(), $_SERVER['ENCRYPTION_KEY']);

        // Adding data to POST
        $data = [
            'platform_name' => "Metatrader 5", // $account->getPlatform(),
            'account_number' => $account->getLogin(),
            'account_password' => $decryptedPassword,
            'server_name' => $account->getTradeServer(),
            'broker_name' => $account->getBroker(),
            'user_id' => '1',
            'role' => 'SLAVE',
        ];


        try {
            $response = $this->request('POST', "account", $data);
        }
        catch (\Exception $e) {
            throw new \RuntimeException('Fehler beim Verbinden mit dem Host: ' . $e->getMessage());
        }

        return $response;
    }

    public function getAccount(Account $account)
    {
        try {
            $id_response = $this->request('GET', "account/paginated?PerPage=100&Page=1&AccountNumber=" . $account->getLogin());
            $id = $id_response->data->data[0]->id;
            $response = $this->request('GET', "account/" . $id);
        }
        catch (\Exception $e) {
            throw new \RuntimeException('Fehler beim Verbinden mit dem Host: ' . $e->getMessage());
        }

        return $response;
    }
    public function updateSubscriber(Account $account, Agent $agent, float $multiplier)
    {
        try {
            // 1. Get Slave Account ID
            $slaveLogin = $account->getLogin();
            $slaveData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $slaveLogin);
            
            if (empty($slaveData->data->data)) {
                throw new \RuntimeException('Slave Account nicht in der Denies API gefunden.');
            }
            $slaveId = $slaveData->data->data[0]->id;

            // 2. Get Master Account ID (Agent)
            $masterLogin = $agent->getMetaId(); // Assuming Agent's meta_id stores the Denies login/ID
            $masterData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $masterLogin);
            
            if (empty($masterData->data->data)) {
                 throw new \RuntimeException('Master Account (Agent) nicht in der Denies API gefunden.');
            }
            $masterId = $masterData->data->data[0]->id;

            // 3. Find Master-Slave relationship
            $masterSlaveData = $this->request('GET', "master-slave/paginated?PerPage=1&Page=1&MasterId=" . $masterId . "&SlaveId=" . $slaveId);
            $masterSlaveId = null;

            if (empty($masterSlaveData->data->data)) {
                 // Create Master-Slave relationship
                 $createData = [
                     'name' => $agent->getName() . ' - ' . $account->getName(),
                     'master_id' => $masterId,
                     'slave_id' => $slaveId
                 ];
                 $createResponse = $this->request('POST', "master-slave", $createData);
                 
                 // Need to fetch it again to get the ID, or assume the response returns it. 
                 // Assuming POST /master-slave returns the created object or ID in 'data'
                 if (isset($createResponse->data) && isset($createResponse->data->id)) {
                      $masterSlaveId = $createResponse->data->id;
                 } else {
                     // Fallback: fetch again
                     $masterSlaveDataRetry = $this->request('GET', "master-slave/paginated?PerPage=1&Page=1&MasterId=" . $masterId . "&SlaveId=" . $slaveId);
                     if (!empty($masterSlaveDataRetry->data->data)) {
                         $masterSlaveId = $masterSlaveDataRetry->data->data[0]->id;
                     } else {
                         throw new \RuntimeException('Konnte Master-Slave Beziehung nicht erstellen/finden.');
                     }
                 }
            } else {
                $masterSlaveId = $masterSlaveData->data->data[0]->id;
            }

            // 4. Set Config (Multiplier)
            $configData = [
                'master_slave_id' => $masterSlaveId,
                'multiplier' => $multiplier
            ];

            // Swagger says POST /api/trader/master-slave-config
            $response = $this->request('POST', "master-slave-config", $configData);

            return $response;
            
        } catch (\Exception $e) {
            throw new \RuntimeException('Fehler beim Verbinden mit dem Host (updateSubscriber): ' . $e->getMessage());
        }
    }

    public function removeSubscriber(Account $account, Agent $agent)
    {
        try {
            // 1. Get Slave Account ID
            $slaveLogin = $account->getLogin();
            $slaveData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $slaveLogin);
            
            if (empty($slaveData->data->data)) {
                return true; // Already gone or not found
            }
            $slaveId = $slaveData->data->data[0]->id;

            // 2. Get Master Account ID
            $masterLogin = $agent->getMetaId(); 
            $masterData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $masterLogin);
            
            if (empty($masterData->data->data)) {
                 return true;
            }
            $masterId = $masterData->data->data[0]->id;

            // 3. Find Master-Slave relationship
            $masterSlaveData = $this->request('GET', "master-slave/paginated?PerPage=1&Page=1&MasterId=" . $masterId . "&SlaveId=" . $slaveId);
            
            if (!empty($masterSlaveData->data->data)) {
                $masterSlaveId = $masterSlaveData->data->data[0]->id;
                // Delete the relationship
                return $this->request('DELETE', "master-slave/" . $masterSlaveId);
            }
            
            return true;

        } catch (\Exception $e) {
             throw new \RuntimeException('Fehler beim Entfernen des Subscribers (Denies): ' . $e->getMessage());
        }
    }

    public function getMultiplier(string $subscriberId) : array
    {
        try {
            // 1. Get Account ID from Account Number
            $accountData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $subscriberId);

            if (empty($accountData->data->data)) {
                 return ['multiplier' => 0.0, 'templateFullName' => "NOT CONNECTED (Account not found)"];
            }

            $accountId = $accountData->data->data[0]->id;

            // 2. Get Master-Slave Pair to find MasterSlaveId
            $masterSlaveData = $this->request('GET', "master-slave/paginated?PerPage=1&Page=1&SlaveId=" . $accountId);

             if (empty($masterSlaveData->data->data)) {
                 return ['multiplier' => 0.0, 'templateFullName' => "NOT CONNECTED (No Master-Slave Pair)"];
            }

            $masterSlaveId = $masterSlaveData->data->data[0]->id;

            // 3. Get Config to get Multiplier
            $configData = $this->request('GET', "master-slave/full-config/" . $masterSlaveId);

            $multiplier = 0.0;
            if (isset($configData->multiplier)) {
                 $multiplier = $configData->multiplier;
            } elseif (isset($configData->data) && isset($configData->data->multiplier)) {
                $multiplier = $configData->data->multiplier;
            }

            // Map Multiplier to Template Name
             $templateFullName = 'Custom Multiplier: ' . $multiplier;

             if ($multiplier == 1.0) $templateFullName = 'DailyGrowthFX-1';
             elseif ($multiplier == 2.0) $templateFullName = 'DailyGrowthFX-2';
             elseif ($multiplier == 3.0) $templateFullName = 'DailyGrowthFX-3';
             elseif ($multiplier == 4.0) $templateFullName = 'DailyGrowthFX-4';
             elseif ($multiplier == 5.0) $templateFullName = 'DailyGrowthFX-5';

             return ['multiplier' => $multiplier, 'templateFullName' => $templateFullName];

        } catch (\Exception $e) {
             return ['multiplier' => 0.0, 'templateFullName' => "ERROR: " . $e->getMessage()];
        }
    }

    public function updateAccount(Account $account, $template = "")
    {
         $multiplier = 1.0;

         if (preg_match('/DailyGrowthFX-(\d+)/', $template, $matches)) {
             $multiplier = (float)$matches[1];
         } elseif (is_numeric($template)) {
             $multiplier = (float)$template;
         }

         // Since updateAccount doesn't have the Agent context natively,
         // we need to find the active Master-Slave relationship instead of creating one.
         try {
             $slaveLogin = $account->getLogin();
             $slaveData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $slaveLogin);
             
             if (empty($slaveData->data->data)) {
                 return false;
             }
             $slaveId = $slaveData->data->data[0]->id;

             // Find active master-slave relationship for this slave
             $masterSlaveData = $this->request('GET', "master-slave/paginated?PerPage=1&Page=1&SlaveId=" . $slaveId);
             
             if (!empty($masterSlaveData->data->data)) {
                 $masterSlaveId = $masterSlaveData->data->data[0]->id;
                 
                 $configData = [
                     'master_slave_id' => $masterSlaveId,
                     'multiplier' => $multiplier
                 ];
                 return $this->request('POST', "master-slave-config", $configData);
             }
         } catch (\Exception $e) {
             // Silently fail or log, as updateAccount is often a fallback
         }
         
         return false;
    }

    public function deleteAccount($account)
    {
        try {
            $id = $account;

            if (is_object($account) && method_exists($account, 'getLogin')) {
                 $login = $account->getLogin();
                 $accountData = $this->request('GET', "account/paginated?PerPage=1&Page=1&AccountNumber=" . $login);
                 if (!empty($accountData->data->data)) {
                    $id = $accountData->data->data[0]->id;
                 } else {
                     return true;
                 }
            }

             return $this->request('DELETE', "account/" . $id);

        } catch (\Exception $e) {
             throw new \RuntimeException('Fehler beim Löschen des Accounts: ' . $e->getMessage());
        }
    }

    /**
     * Entschlüssle ein Passwort
     *
     * @param string $encryptedPassword Das verschlüsselte Passwort (Base64-codiert)
     * @param string $key Der Verschlüsselungsschlüssel
     * @return string Das entschlüsselte Passwort
     * @throws \Exception Wenn die Entschlüsselung fehlschlägt
     */
    private function decryptPassword(string $encryptedPassword, string $key): string
    {
        // Base64 dekodieren
        $decoded = base64_decode($encryptedPassword);
        if ($decoded === false) {
            throw new \Exception('Fehler beim Dekodieren des Base64-Passworts.');
        }

        // Extrahiere den IV (erste 16 Bytes) und den verschlüsselten Text (der Rest)
        $iv = substr($decoded, 0, 16);
        $encrypted = substr($decoded, 16);

        // Entschlüssle den Text
        $decrypted = openssl_decrypt($encrypted, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        if ($decrypted === false) {
            throw new \Exception('Fehler beim Entschlüsseln des Passworts: ' . openssl_error_string());
        }

        return $decrypted;
    }
}