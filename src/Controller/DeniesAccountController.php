<?php

namespace App\Controller;

use App\Service\DeniesClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class DeniesAccountController extends AbstractController
{
    private DeniesClient $DeniesClient;

    public function __construct(DeniesClient $deniesClient)
    {
        $this->deniesClient = $deniesClient;
    }

    /**
     * @Route("/denies", name="app_denies_index", methods={"GET"})
     */
    public function index(): JsonResponse
    {

        if (!$this->isGranted('ROLE_ADMIN')) {
            die;
        }

        echo '<pre>';

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