<?php

namespace App\Service;

use App\Entity\Account;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class DuplikiumClient
{
    private string $baseUrl;
    private string $username;
    private string $token;
    private HttpClientInterface $httpClient;

    public function __construct(HttpClientInterface $httpClient, string $baseUrl = "")
    {
        $this->httpClient = $httpClient;
        $this->baseUrl = "https://www.trade-copier.com/webservice/v4/account/";
        $this->username = "elvtdfinance";
        $this->token = "Tk2NWU1MDJlNTAxNzk4NjdmNDllOGQ";
    }

    private function request(string $method, string $endpoint, array $data = [])
    {
        $response = $this->httpClient->request($method, $this->baseUrl . $endpoint, [
            'headers' => [
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Auth-Username' => $this->username,
                'Auth-Token' => $this->token,
            ],
            'body' => http_build_query($data),
            'verify_peer' => false,
            'verify_host' => false
        ]);

        $statusCode = $response->getStatusCode();

        if ($statusCode === 204) {
            return true;
        }

        if ($statusCode !== 200) {
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
        $subscription = 'auto'; // Automaticaly select an available subscription

        // Name zusammenstellen, ohne Sonderzeichen zu entfernen
        $name = $account->getUser()->getId() . '-' . $account->getUser()->getUsername() . '-' . $account->getName();

        // Passwort entschlüsseln
        if($account->getPlatform() != 'ctrader') {
            $decryptedPassword = $this->decryptPassword($account->getPassword(), $_SERVER['ENCRYPTION_KEY']);
        }

        // Adding data to POST
        $data = [
            'type' => 1, // 0=Master, 1=Slave
            'name' => $name,
            'broker' => $account->getPlatform(), // mt4, mt5, ctrader, lmax, fxcm_fc
            'login' => $account->getLogin(),
            'password' => $account->getPlatform() == 'ctrader' ? '' : $decryptedPassword,
            'server' => $account->getPlatform() == 'ctrader' ? '' : $account->getTradeServer(),
            'environment' => 'Demo', // Demo, Real
            'status' => '1', // The account is 0=disabled, 1=enabled
            'group' => 'NULL', // Always an EMPTY string for Master
            'subscription' => $subscription, // Always an EMPTY string for Master
            'pending' => '0', // 0=disabled, 1=enabled
            'stop_loss' => '0', // 0=disabled, 1=enabled
            'take_profit' => '0', // 0=disabled, 1=enabled
            'comment' => '', // Custom comment that appears in MT4 terminal trade comment. Only for MT4.
            'alert_email' => '0', // 0=disabled, 1=enabled
            'alert_sms' => '0',
            'access_token' => $account->getPlatform() == 'ctrader' ? strval($account->getCtraderAccessToken()) : '',
            'refresh_token' => $account->getPlatform() == 'ctrader' ? strval($account->getCtraderRefreshToken()) : '',
            'expiry_token' =>$account->getPlatform() == 'ctrader' ?  strval($account->getCtraderTokenExpiresAt()->format('Y-m-d H:i:s')) : '',
        ];

        try {
            $response = $this->request('POST', "addAccount.php", $data);
        }
        catch (\Exception $e) {
            throw new \RuntimeException('Fehler beim Verbinden mit dem Host: ' . $e->getMessage());
        }

        return $response;
    }

    public function updateAccount(Account $account, $template = "")
    {
        $data = [
            'account_id' => $account->getMetaId(),
            'type' => 1, // 0=Master, 1=Slave
            'group' => $template,
        ];

        return $this->request('POST', "updateAccount.php", $data);
    }

    public function deleteAccount($account)
    {
        $data = [
            'account_id' => $account,
        ];

        return $this->request('POST', "deleteAccount.php", $data);
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

    public function getMultiplier(string $subscriberId) : array
    {
        $filter = ['account_id' => $subscriberId];

        try {
            $response = $this->request('POST', "getAccounts.php", $filter);
        }
        catch (\Exception $e) {
            throw new \RuntimeException('Fehler beim Verbinden mit dem Host: ' . $e->getMessage());
        }

        if (isset($response->accounts[0]->groupid)) {
            
            $groupId = $response->accounts[0]->groupid;

            $multiplier = null;
            $templateFullName = null;

            switch ($groupId) {
                // DailyGrowthFX (VqND)
                case 'cwZdfafq':
                    $multiplier = 1.0;
                    $templateFullName = 'DailyGrowthFX-1';
                    break;
                case 'LSOdfafq':
                    $multiplier = 1.0;
                    $templateFullName = 'DailyGrowthFX-1 (FTMO)';
                    break;
                case 'mytdfafq':
                    $multiplier = 1.0;
                    $templateFullName = 'DailyGrowthFX-1 (FTMO)';
                    break;
                case 'wUtdfafq':
                    $multiplier = 1.0;
                    $templateFullName = 'DailyGrowthFX-1 (ROBOFOREX)';
                    break;
                case 'wmZdfafq':
                    $multiplier = 2.0;
                    $templateFullName = 'DailyGrowthFX-2';
                    break;
                case 'Uatdfafq':
                    $multiplier = 2.0;
                    $templateFullName = 'DailyGrowthFX-2 (FTMO)';
                    break;
                case 'Jytdfafq':
                    $multiplier = 2.0;
                    $templateFullName = 'DailyGrowthFX-2 (ROBOFOREX)';
                    break;
                case 'JEZdfafq':
                    $multiplier = 3.0;
                    $templateFullName = 'DailyGrowthFX-3';
                    break;
                case 'catdfafq':
                    $multiplier = 3.0;
                    $templateFullName = 'DailyGrowthFX-3 (FTMO)';
                    break;
                case 'aytdfafq':
                    $multiplier = 3.0;
                    $templateFullName = 'DailyGrowthFX-3 (ROBOFOREX)';
                    break;
                case 'aEZdfafq':
                    $multiplier = 4.0;
                    $templateFullName = 'DailyGrowthFX-4';
                    break;
                case 'tatdfafq':
                    $multiplier = 4.0;
                    $templateFullName = 'DailyGrowthFX-4 (FTMO)';
                    break;
                case 'Zytdfafq':
                    $multiplier = 4.0;
                    $templateFullName = 'DailyGrowthFX-4 (ROBOFOREX)';
                    break;
                case 'ZEZdfafq':
                    $multiplier = 5.0;
                    $templateFullName = 'DailyGrowthFX-5';
                    break;
                case 'Latdfafq':
                    $multiplier = 5.0;
                    $templateFullName = 'DailyGrowthFX-5 (FTMO)';
                    break;
                case 'fytdfafq':
                    $multiplier = 5.0;
                    $templateFullName = 'DailyGrowthFX-5 (ROBOFOREX)';
                    break;

                // CoreGrowth EURUSD (C63c)
                case 'fEZdfafq':
                    $multiplier = 1.0;
                    $templateFullName = 'CoreGrowth-EURUSD-1';
                    break;
                case 'mEZdfafq':
                    $multiplier = 2.0;
                    $templateFullName = 'CoreGrowth-EURUSD-2';
                    break;
                case 'cJhdfafq':
                    $multiplier = 3.0;
                    $templateFullName = 'CoreGrowth-EURUSD-3';
                    break;
                case 'tJhdfafq':
                    $multiplier = 4.0;
                    $templateFullName = 'CoreGrowth-EURUSD-4';
                    break;
                case 'LJhdfafq':
                    $multiplier = 5.0;
                    $templateFullName = 'CoreGrowth-EURUSD-5';
                    break;

                // CoreGrowth USDCHF (Z6iT)
                case 'qphdfafq':
                    $multiplier = 1.0;
                    $templateFullName = 'CoreGrowth-USDCHF-1';
                    break;
                case 'Gphdfafq':
                    $multiplier = 2.0;
                    $templateFullName = 'CoreGrowth-USDCHF-2';
                    break;
                case 'rphdfafq':
                    $multiplier = 3.0;
                    $templateFullName = 'CoreGrowth-USDCHF-3';
                    break;
                case 'Zqhdfafq':
                    $multiplier = 4.0;
                    $templateFullName = 'CoreGrowth-USDCHF-4';
                    break;
                case 'aqhdfafq':
                    $multiplier = 5.0;
                    $templateFullName = 'CoreGrowth-USDCHF-5';
                    break;

                default:
                    // throw new \Exception('Unbekannte group_id: ' . $groupId);
                    $multiplier = 0.0;
                    $templateFullName = 'UNSET';
            }

            return ['multiplier' => $multiplier, 'templateFullName' => $templateFullName];
        }

        return ['multiplier' => 0.0, 'templateFullName' => "NOT CONNECTED"];
    }
}