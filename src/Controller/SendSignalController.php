<?php

namespace App\Controller;

use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Signal;

class SendSignalController extends AbstractController
{
    /**
     * @Route("/send-signal", name="app_send_signal", methods={"GET"})
     */
    public function index(): Response
    {
        return $this->render('send_signal/index.html.twig');
    }

    /**
     * @Route("/api/send-signal", name="api_send_signal", methods={"POST"})
     */
    public function sendSignal(Request $request, EntityManagerInterface $entityManager, LoggerInterface $logger): Response
    {
        $data = json_decode($request->getContent(), true);

        // Prüfe, ob $data korrekt decodiert wurde
        if ($data === null) {
            $logger->error('JSON-Dekodierung fehlgeschlagen: ' . json_last_error_msg());
            return new JsonResponse(['error' => 'Ungültiges JSON: ' . json_last_error_msg()], 400);
        }

        // Extrahiere den JSON aus 'signal' und dekodiere erneut
        if (!isset($data['signal'])) {
            $logger->error('Feld "signal" fehlt in den Daten: ' . json_encode($data));
            return new JsonResponse(['error' => 'Feld "signal" fehlt'], 400);
        }

        $signalData = json_decode($data['signal'], true);
        if ($signalData === null) {
            $logger->error('JSON-Dekodierung im "signal"-Feld fehlgeschlagen: ' . json_last_error_msg());
            return new JsonResponse(['error' => 'Ungültiges JSON im "signal"-Feld: ' . json_last_error_msg()], 400);
        }

        // Prüfe die Struktur des extrahierten JSON
        if (!isset($signalData['license'])) {
            $logger->error('Ungültige License im "signal"-Feld: ' . json_encode($signalData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur im "signal"-Feld'], 400);
        }

        // Prüfe die Struktur des extrahierten JSON
        if (!isset($signalData['symbol'])) {
            $logger->error('Ungültige Daten (symbol,action,price) im "signal"-Feld: ' . json_encode($signalData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur (symbol) im "signal"-Feld' . json_encode($signalData) ], 400);
        }

        // Prüfe die Struktur des extrahierten JSON
        if (!isset($signalData['action'])) {
            $logger->error('Ungültige Daten (action) im "signal"-Feld: ' . json_encode($signalData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur (symbol,action,price) im "signal"-Feld' . json_encode($signalData) ], 400);
        }

        // Prüfe die Struktur des extrahierten JSON
        if (!isset($signalData['price'])) {
            $logger->error('Ungültige Daten (price) im "signal"-Feld: ' . json_encode($signalData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur (symbol,action,price) im "signal"-Feld' . json_encode($signalData) ], 400);
        }

        $logger->info('Signal erfolgreich empfangen: ' . json_encode($signalData));

        // Hole den Account anhand der license (meta_id)
        $account = $entityManager->getRepository(\App\Entity\Account::class)->findOneBy(['meta_id' => $signalData['license']]);
        if (!$account) {
            $logger->error('Kein Account mit der angegebenen Lizenz gefunden: ' . $signalData['license']);
            return new JsonResponse(['error' => 'Account not found'], 404);
        }

        // Hole den Benutzer, der dem Account zugeordnet ist
        $user = $account->getUser();
        if (!$user) {
            $logger->error('Kein Benutzer für den Account gefunden: ' . $signalData['license']);
            return new JsonResponse(['error' => 'User not found'], 404);
        }

        // Neues Signal erstellen
        $signal = new Signal();
        $signal->setUser($user);
        $signal->setAccount($account);
        $signal->setAccountMetaId($signalData['license']);
        $signal->setSymbol($signalData['symbol']);
        $signal->setAction($signalData['action']);
        $signal->setPrice((float) $signalData['price']);
        $signal->setCreatedAt(new \DateTimeImmutable());

        // Signal speichern
        try {
            $entityManager->persist($signal);
            $entityManager->flush();
            $logger->info('Signal erfolgreich gespeichert: ' . json_encode($signalData));
        } catch (\Exception $e) {
            $logger->error('Fehler beim Speichern des Signals: ' . $e->getMessage());
            return new JsonResponse(['error' => 'Fehler beim Speichern des Signals'], 500);
        }

        return new JsonResponse(['success' => true, 'signal' => $signalData], 201);
    }
}