<?php

namespace App\Controller;

use App\Entity\Order;
use App\Repository\OrderRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Doctrine\ORM\EntityManagerInterface;

class OrderController extends AbstractController
{
    /**
     * @Route("/orders", name="app_order_index")
     */
    public function listOrders(OrderRepository $orderRepository): Response
    {
        $user = $this->getUser(); // Hole den aktuell angemeldeten Benutzer

        if (!$user) {
            throw $this->createAccessDeniedException('You must be logged in to view orders.');
        }

        // Orders nur für Accounts, die dem aktuellen Benutzer gehören
        $orders = $orderRepository->findByUser($user);

        return $this->render('orders/list.html.twig', [
            'orders' => $orders,
        ]);
    }

    /**
     * @Route("/orders/add", name="add_order")
     */
    public function addOrder(Request $request, EntityManagerInterface $entityManager): Response
    {
        $order = new Order();
        // Setzen der Order-Daten, z.B. von MetaTrader5 erhalten
        // Beispiel: $order->set... (Setzen Sie die Daten entsprechend)

        // Speichern der Order
        $entityManager->persist($order);
        $entityManager->flush();

        return $this->redirectToRoute('app_order_index');
    }
}