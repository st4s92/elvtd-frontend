<?php

namespace App\Controller;

use App\Service\DuplikiumClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class DuplikiumAccountController extends AbstractController
{
    private DuplikiumClient $duplikiumClient;

    public function __construct(DuplikiumClient $duplikiumClient)
    {
        $this->duplikiumClient = $duplikiumClient;
    }

    /**
     * @Route("/duplikium", name="app_duplikium_index", methods={"GET"})
     */
    public function index(): JsonResponse
    {

        /*echo '<pre>';
        $data = [
            'type' => 0, // 0=Master
            'name' => "Live Trading",
            'broker' => "ctrader",
            'login' => "2000947",
            'server' => "ctrader",
            'environment' => 'Demo',
            'status' => '1',
            'group' => '', // Always empty for Master
            'subscription' => 'auto', // Always empty for Master
            'pending' => '0',
            'stop_loss' => '0',
            'take_profit' => '0',
            'comment' => '',
            'alert_email' => '0',
            'alert_sms' => '0',
            'access_token' => 'JeNz13DtPfBBWWomuUUwb_CcGz2urnvIoWdvPleliGc',
            'refresh_token' => 'R7RCEIOfa39eJDpaeRbkEUc37G1x32IkUmYB3B02rR0',
            'expiry_token' => '2026-04-18 14:49:19',
        ];

        echo '<h1>Accounts</h1>';
        var_dump($data);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://www.trade-copier.com/webservice/v4/account/addAccount.php");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/x-www-form-urlencoded',
            'Auth-Username: elvtdfinance',
            'Auth-Token: Tk2NWU1MDJlNTAxNzk4NjdmNDllOGQ',
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        $json = json_decode(curl_exec($ch));
        var_dump($json);
        die;*/

        echo '<br><br><h1>Templates</h1>';
        echo '<h1>Accounts</h1>';
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://www.trade-copier.com/webservice/v4/account/getAccounts.php");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/x-www-form-urlencoded',
            'Auth-Username: elvtdfinance',
            'Auth-Token: Tk2NWU1MDJlNTAxNzk4NjdmNDllOGQ',
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([]));
        $json = json_decode(curl_exec($ch));
        var_dump($json);

        echo '<br><br><h1>Templates</h1>';
        curl_setopt($ch, CURLOPT_URL, "https://www.trade-copier.com/webservice/v4/template/getTemplates.php");
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([]));
        $json = json_decode(curl_exec($ch));
        var_dump($json);#

        echo '<br><br><h1>Reporting</h1>';
        $filter = ['account_id' => ['hKbbKLycc']];
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($filter));
        curl_setopt($ch, CURLOPT_URL, "https://www.trade-copier.com/webservice/v4/reporting/getReporting.php");
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($filter));
        $json = json_decode(curl_exec($ch));
        var_dump($json);

        curl_close($ch);
        die;
    }
}