<?php

namespace App\Controller;

use App\Entity\Account;
use App\Repository\OrderRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class CalendarController extends AbstractController
{
    /**
     * @Route("/calendar/{meta_id}", name="app_calendar")
     */
    public function index(Account $account, OrderRepository $orderRepository): Response
    {
        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            // Weiterleiten auf die Account-Übersicht
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Account existiert nicht oder gehört einem anderen User.');
            return $this->redirectToRoute('app_account_index');
        }

        // Fetch orders for the account
        $allOrders = $orderRepository->findBy(
            ['account' => $account],
            ['open_time' => 'DESC']
        );

        // Group orders by state
        $openPositions = array_filter($allOrders, fn($order) => $order->getState() === 1);
        $closedPositions = array_filter($allOrders, fn($order) => !in_array($order->getState(), [0, 1]));

        return $this->render('calendar/calendar.html.twig', [
            'controller_name' => 'Kalendar',
            'account' => $account,
            'openPositions' => $openPositions,
            'closedPositions' => $closedPositions
        ]);
    }
}
