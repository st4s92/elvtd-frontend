<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use App\Entity\Account;
use App\Form\AccountType;
use App\Repository\AccountRepository;
use App\Repository\AgentRepository;
use App\Repository\OrderRepository;
use App\Repository\SubscriptionRepository;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

class DefaultController extends AbstractController
{
    private HttpClientInterface $httpClient;

    public function __construct(HttpClientInterface $httpClient)
    {
        $this->httpClient = $httpClient;
    }

    /**
     * @Route("/default", name="app_default")
     */
    public function index(
        AccountRepository $accountRepository,
        AgentRepository $agentRepository,
        SubscriptionRepository $subscriptionRepository,
        EntityManagerInterface $entityManager
    ): Response
    {
        // Alle Agent Accounts finden
        $accounts = $accountRepository->findBy(['type' => [1]]);

        // Alle Agents finden
        $agents = $agentRepository->findAll();

        // Alle Accounts des aktuellen Nutzers finden
        $user = $this->getUser();
        $userAccounts = $accountRepository->findBy(['user' => $user]);

        // Last Login aktualisieren
        $user->setLastLogin(new DateTime());
        $entityManager = $this->getDoctrine()->getManager();
        $entityManager->persist($user);
        $entityManager->flush();

        // Datenstruktur für die Tabelle vorbereiten (nur Verbindungen mit Nutzer-Accounts)
        $accountAgentConnections = [];
        $allOrders = [];//$orderRepository->findByUser($user);

        foreach ($userAccounts as $userAccount) {
            $user_agents = $agentRepository->findAgentsByUserAccounts(['from_account_id' => $userAccount]);
            foreach ($user_agents as $agent) {
                $accountAgentConnections[] = [
                    'account' => $userAccount,
                    'agent' => $agent,
                ];
            }

            // Calculate Daily Growth for Charts
            if ($userAccount->getHost() === 'duplikium' || $userAccount->getHost() === 'denies') {
                $dailyGrowthMap = [];
                $accountId = $userAccount->getId();
                $closedPositions = array_filter($allOrders, fn($order) => $order->getAccount()->getId() === $accountId && !in_array($order->getState(), [0, 1]));

                foreach ($closedPositions as $order) {
                    $closeDate = $order->getCloseTime();
                    if (!$closeDate) continue;
                    $dateKey = $closeDate->format('Y-m-d');
                    if (!isset($dailyGrowthMap[$dateKey])) {
                        $dailyGrowthMap[$dateKey] = [
                            'date' => $dateKey,
                            'profit' => 0,
                            'gains' => 0,
                            'balance' => 0,
                            'lots' => 0,
                        ];
                    }
                    $dailyGrowthMap[$dateKey]['profit'] += $order->getProfit() ?? 0;
                    $dailyGrowthMap[$dateKey]['lots'] += $order->getVolume() ?? 0;
                }
                
                $dailyGrowth = array_values($dailyGrowthMap);
                $runningBalance = $userAccount->getBalance() ?? 0;
                
                for ($i = count($dailyGrowth) - 1; $i >= 0; $i--) {
                    $dailyGrowth[$i]['balance'] = $runningBalance;
                    $dailyGrowth[$i]['gains'] = $runningBalance != 0 ? ($dailyGrowth[$i]['profit'] / $runningBalance) * 100 : 0;
                    $runningBalance -= $dailyGrowth[$i]['profit'];
                }
                usort($dailyGrowth, fn($a, $b) => strtotime($a['date']) - strtotime($b['date']));
                $userAccount->setDailyGrowth($dailyGrowth);
            }
        }

        // Subscription des Nutzers laden
        $subscription = $subscriptionRepository->findOneBy(['user' => $user]);

        // Master Trades abrufen (Account ID 120)
        $masterTrades = [];
        try {
            $apiUrl = 'http://65.108.60.88:5021/api/trader/orders/paginated?PerPage=3&Page=1&SortBy=order_open_at&SortOrder=desc&AccountId=120&IsMasterOnly=true';
            $response = $this->httpClient->request('GET', $apiUrl);
            if ($response->getStatusCode() === 200) {
                $content = $response->toArray();
                if (isset($content['data']['data'])) {
                    $masterTrades = $content['data']['data'];
                }
            }
        } catch (\Exception $e) {
            // Logge Fehler oder handle ihn leise
        }

        return $this->render('default/index.html.twig', [
            'controller_name' => 'Dashboard',
            'accounts' => $accounts,
            'agents' => $agents,
            'user_accounts' => $userAccounts,
            'account_agent_connections' => $accountAgentConnections,
            'user' => $user,
            'subscription' => $subscription,
            'master_trades' => $masterTrades
        ]);
    }
}
