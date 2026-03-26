<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\Agent;
use App\Form\AccountType;
use App\Repository\AccountRepository;
use App\Repository\AgentRepository;
use App\Repository\OrderRepository;
use App\Service\DeniesClient;
use App\Service\DuplikiumClient;
use App\Service\MetaApiClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use App\Repository\AccountAgentSubscriptionRepository;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Session\Flash\FlashBagInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Core\Security;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class AgentController extends AbstractController
{
    private FlashBagInterface $flashBag;
    private UrlGeneratorInterface $urlGenerator;
    private HttpClientInterface $httpClient;

    public function __construct(MetaApiClient $metaApiClient,
                                FlashBagInterface $flashBag,
                                UrlGeneratorInterface $urlGenerator,
                                HttpClientInterface $httpClient
    )
    {
        $this->flashBag = $flashBag;
        $this->urlGenerator = $urlGenerator;
        $this->httpClient = $httpClient;
    }

    /**
     * @Route("/admin_agents", name="app_admin_agents_index", methods={"GET"})
     */
    public function admin_agents(AccountRepository $accountRepository, AgentRepository $agentRepository, MetaApiClient $metaApiClient, DuplikiumClient $duplikiumClient): Response
    {
        // Alle Agent Accounts finden
        $accounts = $accountRepository->findBy(['id' => [998]]);

        // Alle Agents finden
        $agents = $agentRepository->findAll();

        // Alle Accounts des aktuellen Nutzers finden
        $userAccounts = $accountRepository->findBy(['user' => $this->getUser()]);

        if ($this->isGranted('ROLE_ADMIN')) {
            // $userAccounts = $accountRepository->findBy(['host' => 'metapi', 'platform' => 'mt5']);
            $userAccounts = $accountRepository->findAll();
        }


        // Datenstruktur für die Tabelle vorbereiten (nur Verbindungen mit Nutzer-Accounts)
        $accountAgentConnections = [];
        foreach ($userAccounts as $userAccount) {
            $user_agents = $agentRepository->findAgentsByUserAccounts(['from_account_id' => $userAccount]);
            foreach ($user_agents as $agent) {
                $multiplier = $userAccount->getHost() == 'duplikium' ? $duplikiumClient->getMultiplier($userAccount->getMetaId()) : $metaApiClient->getMultiplier($userAccount->getMetaId());

                var_dump($userAccount->getMetaId()); die;

                $accountAgentConnections[] = [
                    'account' => $userAccount,
                    'agent' => $agent,
                    'multiplier' => $userAccount->getHost() == 'duplikium' ? $multiplier['multiplier'] : $multiplier,
                    'name' => $userAccount->getHost() == 'duplikium' ? $multiplier['templateFullName'] : 'Agent',
                ];
            }
        }
        return $this->render('agent/index.html.twig', [
            'accounts' => $accounts,
            'agents' => $agents,
            'user_accounts' => $userAccounts,
            'account_agent_connections' => $accountAgentConnections,
        ]);
    }

    /**
     * @Route("/agents", name="app_agents_index", methods={"GET"})
     */
    public function index(AccountRepository $accountRepository, AgentRepository $agentRepository, MetaApiClient $metaApiClient, DuplikiumClient $duplikiumClient): Response
    {
        // Alle Agent Accounts finden
        $accounts = $accountRepository->findBy(['type' => [1]]);

        // Alle Agents finden
        $agents = $agentRepository->findAll();

        // Alle Accounts des aktuellen Nutzers finden
        $userAccounts = $accountRepository->findBy(['user' => $this->getUser()]);

        if ($this->isGranted('ROLE_ADMIN')) {
            //$userAccounts = $accountRepository->findBy(['host' => 'metapi', 'platform' => 'mt5']);
        }

        // Datenstruktur für die Tabelle vorbereiten (nur Verbindungen mit Nutzer-Accounts)
        $accountAgentConnections = [];
        foreach ($userAccounts as $userAccount) {
            $user_agents = $agentRepository->findAgentsByUserAccounts(['from_account_id' => $userAccount]);
            foreach ($user_agents as $agent) {
                $multiplier = $userAccount->getHost() == 'duplikium' ? $duplikiumClient->getMultiplier($userAccount->getMetaId()) : 1; // $metaApiClient->getMultiplier($userAccount->getMetaId());

                $accountAgentConnections[] = [
                    'account' => $userAccount,
                    'agent' => $agent,
                    'multiplier' => $userAccount->getHost() == 'duplikium' ? $multiplier['multiplier'] : $multiplier,
                    'name' => $userAccount->getHost() == 'duplikium' ? $multiplier['templateFullName'] : 'Agent',
                ];
            }
        }
        // Master Trades abrufen (Account ID 120) — alle Orders
        $masterTrades = [];
        $masterTradesTotal = 0;
        try {
            $apiUrl = 'http://65.108.60.88:5021/api/trader/orders/paginated?PerPage=1000&Page=1&SortBy=order_open_at&SortOrder=desc&AccountId=120';
            $response = $this->httpClient->request('GET', $apiUrl);
            if ($response->getStatusCode() === 200) {
                $content = $response->toArray();
                if (isset($content['data']['data'])) {
                    $masterTrades = $content['data']['data'];
                    $masterTradesTotal = $content['data']['total'] ?? count($masterTrades);
                }
            }
        } catch (\Exception $e) {
            // Silently handle
        }

        return $this->render('agent/index.html.twig', [
            'accounts' => $accounts,
            'agents' => $agents,
            'user_accounts' => $userAccounts,
            'account_agent_connections' => $accountAgentConnections,
            'master_trades' => $masterTrades,
            'master_trades_total' => $masterTradesTotal,
            'master_account_login' => !empty($masterTrades[0]['account']['account_number']) ? $masterTrades[0]['account']['account_number'] : 0,
        ]);
    }

    /**
     * @Route("/admin/delete-order/{orderId}", name="app_admin_delete_order", methods={"POST"})
     */
    public function adminDeleteOrder(int $orderId, Request $request, DeniesClient $deniesClient): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        try {
            // First try to close the active order, then soft-delete it
            try {
                $deniesClient->closeActiveOrder($orderId);
            } catch (\Exception $e) {
                // May already be closed, continue with soft-delete
            }
            $deniesClient->softDeleteOrder($orderId);
            $this->addFlash('success', 'Order #' . $orderId . ' wurde gelöscht.');
        } catch (\Exception $e) {
            $this->addFlash('danger', 'Fehler beim Löschen: ' . $e->getMessage());
        }

        $referer = $request->headers->get('referer');
        return new RedirectResponse($referer ?: $this->generateUrl('app_agents_index'));
    }

    /**
     * @Route("/agents/{meta_id}", name="app_agents_show", methods={"GET"})
     */
    public function show(Account $account, OrderRepository $orderRepository, AccountAgentSubscriptionRepository $accountAgentSubscriptionRepository, AgentRepository $agentRepository, MetaApiClient $metaApiClient, DuplikiumClient $duplikiumClient): Response
    {
        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getType() !== 1 && !$this->isGranted('ROLE_ADMIN')) {
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

        // Finde den verbundenen Agent
        $agentId = $accountAgentSubscriptionRepository->findOneBy(['account' => $account]);
        $agent = $agentId ? $agentRepository->find($agentId) : null;

        // Berechne dailyGrowth für account.host != 'metapi'
        $dailyGrowth = [];
        if ($account->getHost() != 'metapi') {
            // Initialisiere dailyGrowth aus geschlossenen Trades
            $dailyGrowthMap = [];

            foreach ($closedPositions as $order) {
                $closeDate = $order->getCloseTime();
                if (!$closeDate) {
                    continue; // Überspringe Trades ohne Schließungsdatum
                }

                // Gruppiere nach Datum (YYYY-MM-DD)
                $dateKey = $closeDate->format('Y-m-d');

                if (!isset($dailyGrowthMap[$dateKey])) {
                    $dailyGrowthMap[$dateKey] = [
                        'date' => $dateKey,
                        'profit' => 0,
                        'gains' => 0, // Prozentuale Gewinne (werden später berechnet)
                        'balance' => 0, // Wird später berechnet
                        'lots' => 0, // Anzahl der Lots (falls verfügbar)
                    ];
                }

                // Summiere Profit und Lots
                $dailyGrowthMap[$dateKey]['profit'] += $order->getProfit() ?? 0;
                $dailyGrowthMap[$dateKey]['lots'] += $order->getVolume() ?? 0;
            }

            // Konvertiere das Map in ein Array und berechne balance und gains
            $dailyGrowth = array_values($dailyGrowthMap);
            $runningBalance = $account->getBalance() ?? 0; // Startwert: aktueller Kontostand

            // Gehe rückwärts durch die Tage, um den Balance-Verlauf zu berechnen
            for ($i = count($dailyGrowth) - 1; $i >= 0; $i--) {
                $dailyGrowth[$i]['balance'] = $runningBalance;
                $dailyGrowth[$i]['gains'] = $runningBalance != 0 ? ($dailyGrowth[$i]['profit'] / $runningBalance) * 100 : 0;
                $runningBalance -= $dailyGrowth[$i]['profit']; // Ziehe den Profit ab, um den vorherigen Balance-Wert zu erhalten
            }

            // Sortiere nach Datum aufsteigend
            usort($dailyGrowth, function($a, $b) {
                return strtotime($a['date']) - strtotime($b['date']);
            });
        } else {
            // Für account.host == 'metapi' verwenden wir die vorhandenen dailyGrowth-Daten
            $dailyGrowth = $account->getDailyGrowth() ?? [];
        }

        $multiplier = $account->getHost() == 'duplikium' ? $duplikiumClient->getMultiplier($account->getMetaId()) : $metaApiClient->getMultiplier($account->getMetaId());

        return $this->render('agent/show.html.twig', [
            'account' => $account,
            'openPositions' => $openPositions,
            'closedPositions' => $closedPositions,
            'dailyGrowth' => $dailyGrowth,
            'agent' => $agent,
            'multiplier' => $multiplier,
        ]);
    }

    /**
     * @Route("/agents/update_subscriber", name="app_agents_update_subscriber", methods={"POST"})
     */
    public function updateSubscriber(Request $request,
                                     AccountRepository $accountRepository,
                                     AgentRepository $agentRepository,
                                     AccountAgentSubscriptionRepository $accountAgentSubscriptionRepository,
                                     MetaApiClient $metaApiClient,
                                     DeniesClient $deniesClient,
                                     DuplikiumClient $duplikiumClient
    ): RedirectResponse
    {
        $subscriberId = $request->request->get('subscriberId');
        $strategyId = $request->request->get('strategyId');
        $multiplier = (float) $request->request->get('multiplier');

        if (!$subscriberId || !$strategyId || !$multiplier) {
            $this->flashBag->add('primary', 'Invalid data provided.');
            return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
        }

        $account = $accountRepository->findOneBy(['meta_id' => $subscriberId]);
        $agent = $agentRepository->findOneBy(['meta_id' => $strategyId]);
        $user = $account->getUser();

        try {
            if ($account && $agent) {
                $accountAgentSubscriptionRepository->subscribe($account, $agent);
            }

            if ($account->getHost() == 'duplikium') {
                $groupId = null;

                switch ($strategyId) {
                    case '58uT': // DailyGrowthFX
                        switch ($multiplier) {
                            case 1:
                                if (stripos($account->getTradeServer(), 'FTMO') !== false) {
                                    $groupId = 'mytdfafq'; // DailyGrowthFX-1 (FTMO)
                                } elseif (stripos($account->getTradeServer(), 'GBE') !== false) {
                                    $groupId = 'LSOdfafq'; // DailyGrowthFX-1 (ROBOFOREX)
                                }
                                elseif (stripos($account->getTradeServer(), 'ROBOFOREX') !== false) {
                                    $groupId = 'wUtdfafq'; // DailyGrowthFX-1 (ROBOFOREX)
                                } elseif (stripos($account->getTradeServer(), 'FundedNext') !== false) {
                                    $groupId = 'wStdfafq'; // DailyGrowthFX-1 (FUNDEDNEXT)
                                }
                                elseif (stripos($account->getTradeServer(), 'ALFX') !== false) {
                                    $groupId = 'qSSdfafq'; // DailyGrowthFX-1 (QUANTUM ALFX)
                                } else {
                                    $groupId = 'cwZdfafq'; // DailyGrowthFX-1 (Default)
                                }
                                break;
                            case 2:
                                if (stripos($account->getTradeServer(), 'FTMO') !== false) {
                                    $groupId = 'Uatdfafq'; // DailyGrowthFX-2 (FTMO)
                                } elseif (stripos($account->getTradeServer(), 'ROBOFOREX') !== false) {
                                    $groupId = 'Jytdfafq'; // DailyGrowthFX-2 (ROBOFOREX)
                                } else {
                                    $groupId = 'wmZdfafq'; // DailyGrowthFX-2 (Default)
                                }
                                break;
                            case 3:
                                if (stripos($account->getTradeServer(), 'FTMO') !== false) {
                                    $groupId = 'catdfafq'; // DailyGrowthFX-3 (FTMO)
                                } elseif (stripos($account->getTradeServer(), 'ROBOFOREX') !== false) {
                                    $groupId = 'aytdfafq'; // DailyGrowthFX-3 (ROBOFOREX)
                                } else {
                                    $groupId = 'JEZdfafq'; // DailyGrowthFX-3 (Default)
                                }
                                break;
                            case 4:
                                if (stripos($account->getTradeServer(), 'FTMO') !== false) {
                                    $groupId = 'tatdfafq'; // DailyGrowthFX-4 (FTMO)
                                } elseif (stripos($account->getTradeServer(), 'ROBOFOREX') !== false) {
                                    $groupId = 'Zytdfafq'; // DailyGrowthFX-4 (ROBOFOREX)
                                } else {
                                    $groupId = 'aEZdfafq'; // DailyGrowthFX-4 (Default)
                                }
                                break;
                            case 5:
                                if (stripos($account->getTradeServer(), 'FTMO') !== false) {
                                    $groupId = 'Latdfafq'; // DailyGrowthFX-5 (FTMO)
                                } elseif (stripos($account->getTradeServer(), 'ROBOFOREX') !== false) {
                                    $groupId = 'fytdfafq'; // DailyGrowthFX-5 (ROBOFOREX)
                                } else {
                                    $groupId = 'ZEZdfafq'; // DailyGrowthFX-5 (Default)
                                }
                                break;
                            default:
                                throw new \Exception('Ungültiger Multiplier für DailyGrowthFX: ' . $multiplier);
                        }
                        break;

                    case 'C63c': // CoreGrowth EURUSD
                        switch ($multiplier) {
                            case 1:
                                $groupId = 'fEZdfafq'; // CoreGrowth-EURUSD-1
                                break;
                            case 2:
                                $groupId = 'mEZdfafq'; // CoreGrowth-EURUSD-2
                                break;
                            case 3:
                                $groupId = 'cJhdfafq'; // CoreGrowth-EURUSD-3
                                break;
                            case 4:
                                $groupId = 'tJhdfafq'; // CoreGrowth-EURUSD-4
                                break;
                            case 5:
                                $groupId = 'LJhdfafq'; // CoreGrowth-EURUSD-5
                                break;
                            default:
                                throw new \Exception('Ungültiger Multiplier für CoreGrowth EURUSD: ' . $multiplier);
                        }
                        break;

                    case 'Z6iT': // CoreGrowth USDCHF
                        switch ($multiplier) {
                            case 1:
                                $groupId = 'qphdfafq'; // CoreGrowth-USDCHF-1
                                break;
                            case 2:
                                $groupId = 'Gphdfafq'; // CoreGrowth-USDCHF-2
                                break;
                            case 3:
                                $groupId = 'rphdfafq'; // CoreGrowth-USDCHF-3
                                break;
                            case 4:
                                $groupId = 'Zqhdfafq'; // CoreGrowth-USDCHF-4
                                break;
                            case 5:
                                $groupId = 'aqhdfafq'; // CoreGrowth-USDCHF-5
                                break;
                            default:
                                throw new \Exception('Ungültiger Multiplier für CoreGrowth USDCHF: ' . $multiplier);
                        }
                        break;

                    default:
                        throw new \Exception('Ungültige Strategy ID: ' . $strategyId);
                }

                if ($groupId) {
                    $duplikiumClient->updateAccount($account, $groupId);
                }
            }
            elseif ($account->getHost() == 'denies') {
                $masterId = ($account->getPlatform() === 'ctrader') ? 120 : 120; // 27;
                $deniesClient->updateSubscriber($account, $agent, $multiplier, $masterId);
            }
            else {
                $data = [
                    'name' => $user->getId() . '-' . $account->getId() . '-' . $account->getName() . '-' . $user->getUsername(),
                    'subscriptions' => [
                        [
                            'strategyId' => $strategyId,
                            'multiplier' => $multiplier
                        ]
                    ]
                ];
                $metaApiClient->updateSubscriber($subscriberId, $data);
            }
            $this->flashBag->add('success', 'Die Strategie wurde erfolgreich abonniert.');
        } catch (\Exception $e) {
            $this->flashBag->add('primary', 'Error updateSubscriber: ' . $e->getMessage());
        }

        $redirectTo = $request->request->get('redirectTo');
        if ($redirectTo) {
            return new RedirectResponse($redirectTo);
        }

        return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
    }

    /**
     * @Route("/agents/remove_subscriber", name="app_agents_remove_subscriber", methods={"POST"})
     */
    public function removeSubscriber(Request $request,
         AccountRepository $accountRepository,
         AgentRepository $agentRepository,
         AccountAgentSubscriptionRepository $accountAgentSubscriptionRepository,
         MetaApiClient $metaApiClient,
         DuplikiumClient $duplikiumClient,
         DeniesClient $deniesClient
    ): RedirectResponse
    {
        // POST-Parameter auslesen
        $subscriberId = $request->request->get('subscriberId');
        $strategyId = $request->request->get('strategyId');
        $redirectTo = $request->request->get('redirectTo');
        $fallbackRedirect = $redirectTo ?: $this->urlGenerator->generate('app_agents_index');

        // Überprüfen, ob beide Parameter vorhanden sind
        if (!$subscriberId || !$strategyId) {
            $this->flashBag->add('primary', 'Ungültige Daten bereitgestellt.');
            return new RedirectResponse($fallbackRedirect);
        }

        $account = $accountRepository->findOneBy(['meta_id' => $subscriberId]);

        // Überprüfen, ob der Account existiert
        if (!$account) {
            $this->flashBag->add('danger', 'Der angegebene Account wurde nicht gefunden.');
            return new RedirectResponse($fallbackRedirect);
        }

        // Überprüfen, ob der Account dem aktuellen Benutzer gehört oder Admin
        if ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            $this->flashBag->add('danger', 'Sie haben keine Berechtigung, diesen Account zu verwalten.');
            return new RedirectResponse($fallbackRedirect);
        }

        $agent = $agentRepository->findOneBy(['meta_id' => $strategyId]);

        if (!$agent) {
            $this->flashBag->add('primary', 'Agent nicht gefunden.');
            return new RedirectResponse($fallbackRedirect);
        }

        try {
            // Entferne die Beziehung in der Datenbank
            $accountAgentSubscriptionRepository->unsubscribe($account, $agent);

            if ($account->getHost() == 'duplikium') {
                $duplikiumClient->updateAccount($account, '');
            }
            elseif ($account->getHost() == 'denies') {
                $masterId = ($account->getPlatform() === 'ctrader') ? 120 : 27;
                $deniesClient->removeSubscriber($account, $agent, $masterId);
            }
            else {
                // Aktualisiere den Subscriber auf der MetaApi
                $metaApiClient->updateSubscriber($subscriberId, [
                    'name' => $account->getName(),
                    'subscriptions' => []
                ]);
            }

            $this->flashBag->add('success', 'Die Strategie wurde erfolgreich entfernt.');
        } catch (\Exception $e) {
            $this->flashBag->add('primary', 'Error removeSubscriber: ' . $e->getMessage());
        }

        return new RedirectResponse($fallbackRedirect);
    }
}