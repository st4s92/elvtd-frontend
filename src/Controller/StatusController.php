<?php

namespace App\Controller;

use DateTime;
use App\Repository\AccountRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class StatusController extends AbstractController
{
    /**
     * @Route("/status", name="app_status")
     */
    public function statusPage(AccountRepository $accountRepository,): JsonResponse
    {
        $account = $accountRepository->find(337);

        if (!$account) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Account mit ID 337 nicht gefunden'
            ], 404);
        }

        $lastUpdate = $account->getLastUpdate();

        if (!$lastUpdate) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Last update ist nicht gesetzt'
            ]);
        }

        // Jetzt prüfen, ob last_update älter als 15 Minuten ist
        $fifteenMinutesAgo = (new DateTime())->modify('-30 minutes');

        if ($lastUpdate < $fifteenMinutesAgo) {

            return false;

            // → älter als 30 Minuten
            return new JsonResponse([
                'success' => false,
                'message' => 'Last update ist älter als 30 Minuten',
                'last_update' => $lastUpdate->format('Y-m-d H:i:s'),
                'fifteenMinutesAgo' => $fifteenMinutesAgo
            ]);
        }

        // Alles gut → last_update ist jünger oder gleich 15 Minuten alt
        return new JsonResponse([
            'success' => true,
            'last_update' => $lastUpdate->format('Y-m-d H:i:s'),
            'age_in_minutes' => (new DateTime())->diff($lastUpdate)->i +
                ((new DateTime())->diff($lastUpdate)->h * 60)
        ]);
    }
}