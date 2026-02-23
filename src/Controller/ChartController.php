<?php

namespace App\Controller;

use App\Repository\AccountRepository;
use App\Repository\AgentRepository;
use App\Repository\OrderRepository;
use App\Service\MetaApiClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ChartController extends AbstractController
{
    /**
     * @Route("/chart", name="app_chart")
     */
    public function index(AccountRepository $accountRepository, AgentRepository $agentRepository, MetaApiClient $metaApiClient, OrderRepository $orderRepository): Response
    {
        // Alle Agent Accounts finden
        $accounts = $accountRepository->findBy(['type' => [1]]);

        // Alle Agents finden
        $agents = $agentRepository->findAll();

        // Alle Accounts des aktuellen Nutzers finden
        $userAccounts = $accountRepository->findBy(['user' => $this->getUser()]);

        // Alle Orders für alle Accounts sammeln, inklusive Account-Infos
        $allOrders = [];
        foreach ($userAccounts as $account) {
            $orders = $orderRepository->findBy(['account' => $account]);

            foreach ($orders as $order) {
                $allOrders[] = [
                    'order' => $order,
                    'account_id' => $account->getId(),
                    'account_login' => $account->getLogin(),
                    'account_name' => $account->getName(),
                    'account_meta_id' => $account->getMetaId(), // Meta-ID hinzufügen
                ];
            }
        }

        // Open Orders filtern (State = 0)
        $openPositions = array_filter($allOrders, fn($entry) => $entry['order']->getState() === 1);

        // Datenstruktur für die Tabelle vorbereiten (nur Verbindungen mit Nutzer-Accounts)
        $accountAgentConnections = [];
        foreach ($userAccounts as $userAccount) {
            $user_agents = $agentRepository->findAgentsByUserAccounts(['from_account_id' => $userAccount]);
            foreach ($user_agents as $agent) {
                $accountAgentConnections[] = [
                    'account' => $userAccount,
                    'agent' => $agent,
                    'multiplier' => $metaApiClient->getMultiplier($userAccount->getMetaId()),
                ];
            }
        }

        return $this->render('charts/eurusd.html.twig', [
            'accounts' => $accounts,
            'agents' => $agents,
            'user_accounts' => $userAccounts,
            'openPositions' => $openPositions,
            'account_agent_connections' => $accountAgentConnections,
            'controller_name' => 'AGB']);
    }
}
