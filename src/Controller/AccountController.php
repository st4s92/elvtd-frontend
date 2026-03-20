<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\Order;
use App\Form\AccountType;
use App\Repository\AccountAgentSubscriptionRepository;
use App\Repository\AccountRepository;
use App\Repository\AgentRepository;
use App\Repository\OrderRepository;
use App\Repository\UserRepository;
use App\Service\DuplikiumClient;
use App\Service\DeniesClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use App\Service\MetaApiClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Doctrine\ORM\EntityManagerInterface;
use DateTime;


class AccountController extends AbstractController
{
    private SessionInterface $session;
    private HttpClientInterface $httpClient;
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;

    public function __construct(SessionInterface $session, HttpClientInterface $httpClient)
    {
        $this->session = $session;
        $this->httpClient = $httpClient;

        $this->clientId = "14630_Dwxh7PHfgv5R8mjONQMBC8PR6InylkpbxuEyGZUX2PhxPfviXo";
        $this->clientSecret = "APVcr7mO3BcKsePjam245sjtBhcv3WgJQezLAMclN7QAMUMCLn";
        $this->redirectUri = "https://app.elvtdfinance.com/auth/ctrader/callback";
    }

    #[Route('/admin_account', name: 'app_admin_account_index', methods: ['GET'])]
    public function admin_account(
        AccountRepository $accountRepository,
        UserRepository $userRepository
    ): Response {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('account/index_admin.html.twig', [
            'accountCount' => count($accountRepository->findAll()),
            'userCount' => count($userRepository->findAll()),
            'form' => $this->createForm(AccountType::class, new Account())->createView(),
            'admin_view' => true,
            'errorOnly' => false,
        ]);
    }

    #[Route('/admin_account_error', name: 'app_admin_account_error', methods: ['GET'])]
    public function admin_account_error(
        AccountRepository $accountRepository,
        UserRepository $userRepository
    ): Response {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('account/index_admin.html.twig', [
            'accountCount' => count($accountRepository->findAll()),
            'userCount' => count($userRepository->findAll()),
            'form' => $this->createForm(AccountType::class, new Account())->createView(),
            'admin_view' => true,
            'errorOnly' => true,
        ]);
    }

    /**
     * @Route("/admin_account/api/data", name="app_admin_account_api_data", methods={"GET"})
     */
    public function adminApiData(
        AccountRepository $accountRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        DeniesClient $deniesClient,
        \Symfony\Component\Security\Csrf\CsrfTokenManagerInterface $csrfTokenManager,
        Request $request
    ): JsonResponse {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return new JsonResponse(['error' => 'forbidden'], 403);
        }

        $errorOnly = $request->query->getBoolean('errorOnly', false);

        if ($errorOnly) {
            $accounts = $accountRepository->createQueryBuilder('a')
                ->where("a.error != ''")
                ->getQuery()
                ->getResult();
        } else {
            $accounts = $accountRepository->findAll();
        }

        $users = $userRepository->findAll();
        $now = new \DateTime();

        // Lightweight status-only refresh for denies accounts (no position/order sync)
        foreach ($accounts as $account) {
            if ($account->getHost() === 'denies') {
                $lastUpdate = $account->getLastUpdate();
                if (!$lastUpdate || ($now->getTimestamp() - $lastUpdate->getTimestamp()) > 60) {
                    try {
                        $response = $deniesClient->getAccount($account);
                        if ($response->code == 200) {
                            $accountData = $response->data[0] ?? $response->data->data[0] ?? null;
                            if ($accountData) {
                                $account->setEquity((float)($accountData->equity ?? 0));
                                $account->setBalance((float)($accountData->balance ?? 0));

                                $apiDateStr = $accountData->updated_at ?? $accountData->updatedAt ?? null;
                                if ($apiDateStr) {
                                    if (!str_contains($apiDateStr, 'Z') && !str_contains($apiDateStr, '+')) {
                                        $apiDateStr .= 'Z';
                                    }
                                    $apiUpdatedAt = new \DateTime($apiDateStr);
                                    $account->setLastUpdate($apiUpdatedAt);
                                    $nowUTC = new \DateTime('now', new \DateTimeZone('UTC'));
                                    $diff = $nowUTC->getTimestamp() - $apiUpdatedAt->getTimestamp();
                                    if ($diff > 300) {
                                        $account->setError('STÖRUNG');
                                        $account->setIsActive(false);
                                    } else {
                                        $account->setError('');
                                        $account->setIsActive(true);
                                    }
                                }
                                $accountRepository->add($account, false);
                            }
                        }
                    } catch (\Exception $e) { }
                }
            }
        }
        try { $entityManager->flush(); } catch (\Exception $e) { }

        $totalEquity = $totalBalance = $totalProfit = $totalDeposits = $totalWithdrawals = 0;
        $accountsData = [];

        foreach ($accounts as $account) {
            $totalEquity += $account->getEquity() ?? 0;
            $totalBalance += $account->getBalance() ?? 0;
            $totalProfit += $account->getProfit() ?? 0;
            $totalDeposits += $account->getDeposits() ?? 0;
            $totalWithdrawals += $account->getWithdrawals() ?? 0;

            $user = $account->getUser();
            $accountsData[] = [
                'name' => $account->getName(),
                'login' => $account->getLogin(),
                'broker' => $account->getBroker(),
                'platform' => $account->getPlatform(),
                'host' => $account->getHost(),
                'metaId' => $account->getMetaId(),
                'equity' => $account->getEquity() ?? 0,
                'balance' => $account->getBalance() ?? 0,
                'profit' => $account->getProfit() ?? 0,
                'gain' => $account->getGain() ?? 0,
                'deposits' => $account->getDeposits() ?? 0,
                'withdrawals' => $account->getWithdrawals() ?? 0,
                'isActive' => $account->getIsActive(),
                'error' => $account->getError() ?? '',
                'lastUpdate' => $account->getLastUpdate() ? $account->getLastUpdate()->format('d.m.Y H:i:s') : '',
                'username' => $user ? $user->getUsername() : '',
                'userFullname' => $user ? trim(($user->getFirstname() ?? '') . ' ' . ($user->getLastname() ?? '')) : '',
                'showUrl' => $account->getMetaId() ? $this->generateUrl('app_account_show', ['meta_id' => $account->getMetaId()]) : null,
                'editUrl' => $account->getMetaId() ? $this->generateUrl('app_account_edit', ['meta_id' => $account->getMetaId()]) : null,
                'deleteUrl' => $account->getMetaId() ? $this->generateUrl('app_account_delete', ['meta_id' => $account->getMetaId()]) : null,
                'deleteToken' => $account->getMetaId() ? $csrfTokenManager->getToken('delete' . $account->getMetaId())->getValue() : null,
                'flattenUrl' => ($account->getHost() === 'metapi' && $account->getMetaId()) ? $this->generateUrl('app_metapi_close_all', ['meta_id' => $account->getMetaId()]) : null,
            ];
        }

        // Active users
        $thirtyMinutesAgo = (clone $now)->modify('-30 minutes');
        $twentyFourHoursAgo = (clone $now)->modify('-24 hours');
        $activeLast30Min = $activeLast24h = 0;
        foreach ($users as $user) {
            $lastLogin = $user->getLastLogin();
            if ($lastLogin instanceof \DateTime && $lastLogin >= $thirtyMinutesAgo) $activeLast30Min++;
            if ($lastLogin instanceof \DateTime && $lastLogin >= $twentyFourHoursAgo) $activeLast24h++;
        }

        return new JsonResponse([
            'accounts' => $accountsData,

            'totalEquity' => $totalEquity,
            'totalBalance' => $totalBalance,
            'totalProfit' => $totalProfit,
            'totalDeposits' => $totalDeposits,
            'totalWithdrawals' => $totalWithdrawals,
            'accountCount' => count($accounts),
            'userCount' => count($users),
            'activeLast30Min' => $activeLast30Min,
            'activeLast24h' => $activeLast24h,
        ]);
    }

    /**
     * @Route("/account", name="app_account_index", methods={"GET"})
     */
    public function index(
        AccountRepository $accountRepository,
        EntityManagerInterface $entityManager
    ): Response
    {
        $user = $this->getUser();
        $user->setLastLogin(new \DateTime());
        $entityManager->persist($user);
        $entityManager->flush();

        // Load page instantly without refreshing accounts — data loads async via API
        $accounts = $accountRepository->findBy(['user' => $this->getUser()]);

        return $this->render('account/index.html.twig', [
            'accountCount' => count($accounts),
            'form' => $this->createForm(AccountType::class, new Account())->createView(),
            'maxAccounts' => $user->getMaxAccounts(),
        ]);
    }

    /**
     * @Route("/account/api/data", name="app_account_api_data", methods={"GET"})
     */
    public function apiData(
        AccountRepository $accountRepository,
        OrderRepository $orderRepository,
        EntityManagerInterface $entityManager,
        DeniesClient $deniesClient,
        DuplikiumClient $duplikiumClient,
        \Symfony\Component\Security\Csrf\CsrfTokenManagerInterface $csrfTokenManager
    ): JsonResponse
    {
        $user = $this->getUser();
        $accounts = $accountRepository->findBy(['user' => $user]);

        // Refresh accounts (the heavy part)
        $now = new \DateTime();
        foreach ($accounts as $account) {
            $lastUpdate = $account->getLastUpdate();
            if (!$lastUpdate || ($now->getTimestamp() - $lastUpdate->getTimestamp()) > 60 || $account->getError() !== '') {
                try {
                    $this->refreshAccountStats($account, $deniesClient, $duplikiumClient, $accountRepository, $orderRepository, $entityManager);
                } catch (\Exception $e) {
                }
            }
        }

        try {
            $entityManager->flush();
        } catch (\Exception $e) {
        }

        // Build daily growth for denies/duplikium accounts
        $allOrders = $orderRepository->findByUser($user);

        $totalEquity = 0;
        $totalBalance = 0;
        $totalProfit = 0;
        $totalDeposits = 0;
        $totalWithdrawals = 0;

        $accountsData = [];

        foreach ($accounts as $account) {
            $totalEquity += $account->getEquity() ?? 0;
            $totalBalance += $account->getBalance() ?? 0;
            $totalProfit += $account->getProfit() ?? 0;
            $totalDeposits += $account->getDeposits() ?? 0;
            $totalWithdrawals += $account->getWithdrawals() ?? 0;

            $dailyGrowth = [];
            if ($account->getHost() === 'duplikium' || $account->getHost() === 'denies') {
                $dailyGrowthMap = [];
                $accountId = $account->getId();
                $closedPositions = array_filter($allOrders, fn($order) => $order->getAccount()->getId() === $accountId && !in_array($order->getState(), [0, 1]));

                foreach ($closedPositions as $order) {
                    $closeDate = $order->getCloseTime();
                    if (!$closeDate) continue;
                    $dateKey = $closeDate->format('Y-m-d');
                    if (!isset($dailyGrowthMap[$dateKey])) {
                        $dailyGrowthMap[$dateKey] = ['date' => $dateKey, 'profit' => 0, 'gains' => 0, 'balance' => 0, 'lots' => 0];
                    }
                    $dailyGrowthMap[$dateKey]['profit'] += $order->getProfit() ?? 0;
                    $dailyGrowthMap[$dateKey]['lots'] += $order->getVolume() ?? 0;
                }

                $dailyGrowth = array_values($dailyGrowthMap);
                $runningBalance = $account->getBalance() ?? 0;
                for ($i = count($dailyGrowth) - 1; $i >= 0; $i--) {
                    $dailyGrowth[$i]['balance'] = $runningBalance;
                    $dailyGrowth[$i]['gains'] = $runningBalance != 0 ? ($dailyGrowth[$i]['profit'] / $runningBalance) * 100 : 0;
                    $runningBalance -= $dailyGrowth[$i]['profit'];
                }
                usort($dailyGrowth, fn($a, $b) => strtotime($a['date']) - strtotime($b['date']));
            } else {
                $dailyGrowth = $account->getDailyGrowth() ?? [];
            }

            $accountsData[] = [
                'name' => $account->getName(),
                'login' => $account->getLogin(),
                'broker' => $account->getBroker(),
                'platform' => $account->getPlatform(),
                'host' => $account->getHost(),
                'metaId' => $account->getMetaId(),
                'equity' => $account->getEquity() ?? 0,
                'balance' => $account->getBalance() ?? 0,
                'profit' => $account->getProfit() ?? 0,
                'gain' => $account->getGain() ?? 0,
                'deposits' => $account->getDeposits() ?? 0,
                'withdrawals' => $account->getWithdrawals() ?? 0,
                'isActive' => $account->getIsActive(),
                'error' => $account->getError() ?? '',
                'dailyGrowth' => $dailyGrowth,
                'showUrl' => $this->generateUrl('app_account_show', ['meta_id' => $account->getHost() === 'denies' ? $account->getLogin() : $account->getMetaId()]),
                'editUrl' => $this->generateUrl('app_account_edit', ['meta_id' => $account->getMetaId()]),
                'deleteUrl' => $this->generateUrl('app_account_delete', ['meta_id' => $account->getMetaId()]),
                'deleteToken' => $csrfTokenManager->getToken('delete' . $account->getMetaId())->getValue(),
                'reauthUrl' => $account->getPlatform() === 'ctrader' ? $this->generateUrl('app_auth_ctrader_reauth', ['meta_id' => $account->getMetaId()]) : null,
                'agents' => $account->getAgents()->map(fn($a) => ['id' => $a->getId(), 'name' => $a->getName()])->toArray(),
            ];
        }

        // Yesterday profit
        $yesterday = (new \DateTime('-1 day'))->format('Y-m-d');
        $totalYesterdayProfit = 0;
        foreach ($accountsData as $acc) {
            foreach ($acc['dailyGrowth'] as $g) {
                if ($g['date'] === $yesterday) {
                    $totalYesterdayProfit += $g['profit'] ?? 0;
                }
            }
        }

        return new JsonResponse([
            'accounts' => $accountsData,
            'totalEquity' => $totalEquity,
            'totalBalance' => $totalBalance,
            'totalProfit' => $totalProfit,
            'totalDeposits' => $totalDeposits,
            'totalWithdrawals' => $totalWithdrawals,
            'totalYesterdayProfit' => $totalYesterdayProfit,
        ]);
    }

    /**
     * @Route("/auth/ctrader/reauth/{meta_id}", name="app_auth_ctrader_reauth", methods={"GET"})
     */
    public function reauthCtrader(string $meta_id, AccountRepository $accountRepository): Response
    {
        $account = $accountRepository->findOneBy(['meta_id' => $meta_id]);
        if (!$account) {
            $this->session->getFlashBag()->add('danger', 'Account nicht gefunden.');
            return $this->redirectToRoute('app_account_index');
        }

        if ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            $this->session->getFlashBag()->add('danger', 'Keine Berechtigung.');
            return $this->redirectToRoute('app_account_index');
        }

        $this->session->set('ctrader_auth_login', $account->getLogin());
        $this->session->set('ctrader_reauth', true);

        return $this->redirectToRoute('app_auth_ctrader');
    }

    /**
     * @Route("/auth/ctrader", name="app_auth_ctrader", methods={"GET"})
     */
    public function authCtrader(Request $request): Response
    {
        // Hole den Login-Wert aus der Session (wird in new() gesetzt)
        $login = $this->session->get('ctrader_auth_login');
        if (!$login) {
            $this->session->getFlashBag()->add('danger', 'Kein Login-Wert für die Authentifizierung gefunden.');
            return $this->redirectToRoute('app_account_index');
        }

        // Erstelle die URL für die Autorisierungsseite
        $authUrl = 'https://id.ctrader.com/my/settings/openapi/grantingaccess/?' . http_build_query([
                'client_id' => $this->clientId,
                'redirect_uri' => $this->redirectUri,
                'scope' => 'trading', // Berechtigungen: 'trading' für Handelsoperationen
                'product' => 'web',
                'state' => $login, // Login als State übergeben, um es später wiederzuerkennen
            ]);

        // Weiterleitung direkt zur cTrader-Login-Seite
        return $this->redirect($authUrl);
    }

    /**
     * @Route("/auth/ctrader/callback", name="app_auth_ctrader_callback", methods={"GET"})
     */
    public function authCtraderCallback(Request $request, AccountRepository $accountRepository, EntityManagerInterface $entityManager, DeniesClient $deniesClient): Response
    {
        // Hole den Autorisierungscode und den State (login) aus den Query-Parametern
        $code = $request->query->get('code');
        $login = $request->query->get('state');

        if (!$code) {
            $this->session->getFlashBag()->add('danger', 'Kein Autorisierungscode erhalten.');
            return $this->redirectToRoute('app_account_index');
        }

        if (!$login) {
            $this->session->getFlashBag()->add('danger', 'Kein Login-Wert im Callback erhalten.');
            return $this->redirectToRoute('app_account_index');
        }

        // Finde das Account-Objekt anhand des Login-Werts
        $account = $accountRepository->findOneBy(['login' => $login]);
        if (!$account) {
            $this->session->getFlashBag()->add('danger', 'Account mit Login ' . $login . ' nicht gefunden.');
            return $this->redirectToRoute('app_account_index');
        }

        // Tausche den Autorisierungscode gegen ein Access Token (GET-Request)
        try {
            $response = $this->httpClient->request('GET', 'https://openapi.ctrader.com/apps/token', [
                'query' => [
                    'grant_type' => 'authorization_code',
                    'code' => $code,
                    'redirect_uri' => $this->redirectUri,
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                ],
            ]);

            $tokenData = $response->toArray();

            if(!$tokenData['expires_in']) {
                $this->addFlash('danger', $tokenData['description']);
                return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
            }
        } catch (\Exception $e) {
            $this->session->getFlashBag()->add('danger', 'Fehler beim Abrufen des Access Tokens: ' . $e->getMessage());
        }

        // Speichere die Token-Daten im Account-Objekt
        $account->setHost('denies');
        $account->setMetaId($account->getLogin());
        $account->setCtraderAccessToken($tokenData['access_token']);
        $account->setCtraderAccessToken($tokenData['access_token']);
        $account->setCtraderRefreshToken($tokenData['refresh_token']);
        $account->setCtraderTokenExpiresAt((new \DateTime())->modify('+'.$tokenData['expires_in'].' seconds'));

        $isReauth = $this->session->get('ctrader_reauth', false);

        if ($isReauth && $account->getMetaId()) {
            // Reauth: Nur Tokens aktualisieren, Account existiert bereits bei Denies
            $entityManager->persist($account);
            $entityManager->flush();

            $this->session->remove('ctrader_auth_login');
            $this->session->remove('ctrader_reauth');

            $this->addFlash('success', 'cTrader Tokens für Account ' . $account->getLogin() . ' wurden erfolgreich aktualisiert.');

            return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getMetaId()]);
        }

        // Neuer Account: Bei Denies registrieren
        $account->setHost('denies');
        $response = $deniesClient->addAccount($account);

        if (isset($tokenData['access_token']) && strlen($tokenData['access_token']) > 1) {
            $this->addFlash('success', 'cTrader Account ' . $response->data->accountNumber . ' wurde erfolgreich verbunden.');
        } else {
            if (isset($response->error) && strlen($response->error) > 1) {
                $this->addFlash('danger', strip_tags($response->error));
            } else {
                $this->addFlash('danger', 'Account-Erstellung fehlgeschlagen. Account wurde nicht erstellt.');
            }
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        $entityManager->persist($account);
        $entityManager->flush();

        $this->session->getFlashBag()->add('success', 'cTrader Authentifizierung erfolgreich.');

        // Entferne den Login-Wert aus der Session
        $this->session->remove('ctrader_auth_login');

        return $this->redirectToRoute('app_account_index');
    }

    /**
     * Prüfe und aktualisiere das Access Token
     */
    private function getAccessToken(Account $account, EntityManagerInterface $entityManager): string
    {
        // Prüfe, ob ein Access Token existiert
        if (!$account->getCtraderAccessToken() || !$account->getCtraderRefreshToken()) {
            // Speichere den Login-Wert in der Session, um ihn im Callback zu verwenden
            $this->session->set('ctrader_auth_login', $account->getLogin());
            // Wirf eine Exception, um die Weiterleitung auszulösen
            throw new \Exception('Authentifizierung erforderlich. Bitte melde dich bei cTrader an.');
        }

        $expiresAt = $account->getCtraderTokenExpiresAt();
        $now = new \DateTime();

        // Wenn das Token abgelaufen ist, erneuere es
        if ($expiresAt < $now) {
            $response = $this->httpClient->request('GET', 'https://openapi.ctrader.com/apps/token', [
                'query' => [
                    'grant_type' => 'refresh_token',
                    'refresh_token' => $account->getCtraderRefreshToken(),
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                ],
            ]);

            $tokenData = $response->toArray();
            $account->setCtraderAccessToken($tokenData['access_token']);
            $account->setCtraderRefreshToken($tokenData['refresh_token']);
            $account->setCtraderTokenExpiresAt((new \DateTime())->modify('+'.$tokenData['expires_in'].' seconds'));

            $entityManager->persist($account);
            $entityManager->flush();
        }

        return $account->getCtraderAccessToken();
    }

    /**
     * @Route("/account/new", name="app_account_new", methods={"GET", "POST"})
     */
    public function new(
        Request $request,
        AccountRepository $accountRepository,
        DuplikiumClient $duplikiumClient,
        DeniesClient $deniesClient,
        EntityManagerInterface $entityManager,
    ): Response
    {
        $account = new Account();
        $form = $this->createForm(AccountType::class, $account);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Setze den User des Accounts auf den aktuell eingeloggenen User
            $account->setUser($this->getUser());
            $account->setHost('denies');
            $account->setType(3);
            $account->setMetaId($account->getLogin());

            if ($account->getPlatform() == "ctrader") {
                try {
                    $accessToken = $this->getAccessToken($account, $entityManager);
                } catch (\Exception $e) {
                    if ($e->getMessage() === 'Authentifizierung erforderlich. Bitte melde dich bei cTrader an.') {
                        // Speichere den Account temporär in der Datenbank
                        $accountRepository->add($account, true);
                        return $this->redirectToRoute('app_auth_ctrader');
                    }
                    $this->addFlash('danger', 'Fehler bei der cTrader Authentifizierung: ' . $e->getMessage());
                    return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
                }
            } else {
                // Verschlüssle das Passwort
                $key = $_SERVER['ENCRYPTION_KEY'];
                $encryptedPassword = $this->encryptPassword($account->getPassword(), $key);
                $account->setPassword($encryptedPassword); // Verschlüsseltes Passwort setzen
            }

            if($account->getPlatform() == 'ctrader') {
                $account->setHost('denies');
                $response = $deniesClient->addAccount($account);
            }
            else {
                $account->setHost('duplikium');
                $response = $duplikiumClient->addAccount($account);
            }

            if($account->getHost() == 'denies') {
                $this->addFlash('success', 'Acount '. $account->getLogin() .' wurde erfolgreich verbunden.');
                $accountRepository->add($account, true);    
            }
            elseif($account->getHost() == 'duplikium') {
                $this->addFlash('success', 'Acount '. $account->getLogin() .' wurde erfolgreich verbunden.');

                $account->setHost('duplikium');
                $account->setMetaId($response->account->account_id);
                $account->setBalance($response->account->balance);
                $account->setEquity($response->account->equity);

                // Account in die Datenbank speichern
                $accountRepository->add($account, true);
            } else {
                if (isset($response->error) && strlen($response->error) > 1) {
                    $this->addFlash('danger', strip_tags($response->error));
                } else {
                    $this->addFlash('danger', 'Account-Erstellung fehlgeschlagen. Account wurde nicht erstellt.');
                }
                return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
            }

            // Flash-Nachricht hinzufügen
            $this->addFlash('success', 'Account wurde erfolgreich erstellt.');

            // Weiterleitung zur Account-Indexseite
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('account/new.html.twig', [
            'account' => $account,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/account/{meta_id}", name="app_account_show", methods={"GET"})
     */
    public function show(
        string $meta_id,
        AccountRepository $accountRepository,
        DeniesClient $deniesClient,
        DuplikiumClient $duplikiumClient,
        OrderRepository $orderRepository,
        EntityManagerInterface $entityManager,
        AccountAgentSubscriptionRepository $accountAgentSubscriptionRepository,
        AgentRepository $agentRepository,
        MetaApiClient $metaApiClient
    ): Response {
        $account = $accountRepository->findOneBy(['meta_id' => $meta_id]);
        if (!$account) {
            $account = $accountRepository->findOneBy(['login' => $meta_id]);
        }

        if (!$account || ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN'))) {
            $this->addFlash('danger', 'Account-Validierung fehlgeschlagen.');
            return $this->redirectToRoute('app_account_index');
        }

        // Automatische Aktualisierung, wenn das letzte Update länger als 1 Minute her ist
        $now = new \DateTime();
        $lastUpdate = $account->getLastUpdate();
        if (!$lastUpdate || ($now->getTimestamp() - $lastUpdate->getTimestamp()) > 60) {
            try {
                $this->refreshAccountStats($account, $deniesClient, $duplikiumClient, $accountRepository, $orderRepository, $entityManager);
                
                try {
                    $entityManager->flush();
                } catch (\Exception $e) {
                    error_log("Show Account Flush Failed: " . $e->getMessage());
                }
            } catch (\Exception $e) {
                // Fehler beim automatischen Update ignorieren, um die Anzeige nicht zu blockieren
            }
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

        if ($account->getHost() == 'duplikium') {
            $multiplier = $duplikiumClient->getMultiplier($account->getMetaId());
        } elseif ($account->getHost() == 'denies') {
            $multiplier = $deniesClient->getMultiplier($account->getLogin());
        } else {
            $multiplier = ['multiplier' => 1, 'templateFullName' => 'MetaAPI'];
        }

        // Denies accounts: use new modern template with live API data
        if ($account->getHost() === 'denies') {
            $apiData = null;
            $allClosedTrades = [];
            try {
                $backendId = $deniesClient->getAccountIdByLogin($account->getLogin());
                if ($backendId) {
                    $apiData = $deniesClient->getAccountDetail($backendId);
                    $allClosedTrades = $deniesClient->getClosedOrders($backendId);

                    // Enrich active orders with open time from getOpenPositions endpoint
                    if ($apiData && isset($apiData->orders) && !empty($apiData->orders)) {
                        $openPositionsApi = $deniesClient->getOpenPositions($backendId);

                        // Build ticket -> order_open_at lookup from paginated orders
                        $openTimeByTicket = [];
                        foreach ($openPositionsApi as $op) {
                            $ticket = $op->order_ticket ?? $op->orderTicket ?? $op->OrderTicket ?? null;
                            $openAt = $op->order_open_at ?? $op->orderOpenAt ?? $op->OrderOpenAt ?? null;
                            if ($ticket && $openAt) {
                                $openTimeByTicket[(string)$ticket] = $openAt;
                            }
                        }

                        // Merge open time into apiData->orders
                        foreach ($apiData->orders as &$order) {
                            $ticket = $order->OrderTicket ?? $order->orderTicket ?? $order->order_ticket ?? null;
                            if ($ticket && isset($openTimeByTicket[(string)$ticket])) {
                                $order->order_open_at = $openTimeByTicket[(string)$ticket];
                            }
                        }
                        unset($order); // break reference
                    }
                }
            } catch (\Exception $e) {
                // Fallback: apiData bleibt null, Template zeigt lokale DB-Daten
            }

            // Sort closed trades descending by close date (newest first)
            if (!empty($allClosedTrades)) {
                usort($allClosedTrades, function($a, $b) {
                    $dateA = $a->order_close_at ?? $a->orderCloseAt ?? '';
                    $dateB = $b->order_close_at ?? $b->orderCloseAt ?? '';
                    return strcmp($dateB, $dateA);
                });
            }

            $agents = $agentRepository->findAll();

            return $this->render('account/show_denies.html.twig', [
                'account' => $account,
                'apiData' => $apiData,
                'allClosedTrades' => $allClosedTrades,
                'openPositions' => $openPositions,
                'closedPositions' => $closedPositions,
                'dailyGrowth' => $dailyGrowth,
                'agent' => $agent,
                'multiplier' => $multiplier,
                'agents' => $agents,
            ]);
        }

        return $this->render('account/show.html.twig', [
            'account' => $account,
            'openPositions' => $openPositions,
            'closedPositions' => $closedPositions,
            'dailyGrowth' => $dailyGrowth,
            'agent' => $agent,
            'multiplier' => $multiplier,
        ]);
    }

    /**
     * @Route("/account/{meta_id}/flush-positions", name="app_account_flush_positions", methods={"POST"})
     */
    public function flushPositions(Request $request, Account $account, DeniesClient $deniesClient): Response
    {
        if (!$account || ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN'))) {
            $this->session->getFlashBag()->add('danger', 'Zugriff verweigert.');
            return $this->redirectToRoute('app_account_index');
        }

        if ($account->getHost() !== 'denies') {
            $this->session->getFlashBag()->add('danger', 'Diese Funktion ist nur für Denies-Accounts verfügbar.');
            return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getMetaId()]);
        }

        try {
            $backendId = $deniesClient->getAccountIdByLogin($account->getLogin());
            if (!$backendId) {
                throw new \RuntimeException('Account im Backend nicht gefunden.');
            }

            // Get active order IDs for slave accounts
            $activeOrderIds = [];
            if ($account->getType() !== 2) { // Not a leader/master
                $apiData = $deniesClient->getAccountDetail($backendId);
                if ($apiData && isset($apiData->orders)) {
                    foreach ($apiData->orders as $order) {
                        $id = $order->Id ?? $order->id ?? null;
                        if ($id) $activeOrderIds[] = (int) $id;
                    }
                }
            }

            $role = ($account->getType() === 2) ? 'MASTER' : 'SLAVE';
            $deniesClient->flushAllPositions($backendId, $role, $activeOrderIds);

            $this->session->getFlashBag()->add('success', 'Alle Positionen werden geschlossen.');
        } catch (\Exception $e) {
            $this->session->getFlashBag()->add('danger', 'Fehler: ' . $e->getMessage());
        }

        return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getHost() === 'denies' ? $account->getLogin() : $account->getMetaId()]);
    }

    /**
     * @Route("/account/{meta_id}/close-order/{orderId}", name="app_account_close_order", methods={"POST"})
     */
    public function closeOrder(Request $request, Account $account, int $orderId, DeniesClient $deniesClient): Response
    {
        if (!$account || ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN'))) {
            $this->session->getFlashBag()->add('danger', 'Zugriff verweigert.');
            return $this->redirectToRoute('app_account_index');
        }

        if ($account->getHost() !== 'denies') {
            $this->session->getFlashBag()->add('danger', 'Diese Funktion ist nur für Denies-Accounts verfügbar.');
            return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getMetaId()]);
        }

        try {
            $deniesClient->closeActiveOrder($orderId);
            $this->session->getFlashBag()->add('success', 'Position wird geschlossen.');
        } catch (\Exception $e) {
            $this->session->getFlashBag()->add('danger', 'Fehler: ' . $e->getMessage());
        }

        return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getHost() === 'denies' ? $account->getLogin() : $account->getMetaId()]);
    }

    /**
     * @Route("/account/{meta_id}/edit", name="app_account_edit", methods={"GET", "POST"})
     */
    public function edit(Request $request, Account $account, AccountRepository $accountRepository): Response
    {
        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            // Weiterleiten auf die Account-Übersicht
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Account existiert nicht oder gehört einem anderen User.');
            return $this->redirectToRoute('app_account_index');
        }

        $form = $this->createForm(AccountType::class, $account);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Änderungen speichern
            $accountRepository->add($account, true);

            // Weiterleitung zur Account-Indexseite
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('account/edit.html.twig', [
            'account' => $account,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/account/{meta_id}", name="app_account_delete", methods={"POST"})
     */
    public function delete(string $meta_id, Request $request, AccountRepository $accountRepository, MetaApiClient $metaApiClient, DuplikiumClient $duplikiumClient, DeniesClient $deniesClient): Response
    {
        // Account anhand der meta_id finden
        $account = $accountRepository->findOneBy(['meta_id' => $meta_id]);

        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            // Weiterleiten auf die Account-Übersicht
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Account existiert nicht oder gehört einem anderen User.');
            return $this->redirectToRoute('app_account_index');
        }

        // Prüfen, ob der Account existiert
        if (!$account) {
            $this->session->getFlashBag()->add('danger', 'Account konnte nicht gefunden werden.');
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        // CSRF-Token validieren und Account löschen
        if ($this->isCsrfTokenValid('delete' . $account->getMetaId(), $request->request->get('_token'))) {

            try {
                if ($account->getHost() == "denies") {
                    $deniesClient->deleteAccount($account);
                } elseif ($account->getHost() == "duplikium") {
                    $duplikiumClient->deleteAccount($meta_id);
                } else {
                    $metaApiClient->deleteAccount($meta_id);
                }
            }
            catch (\Exception $e) {
                $this->session->getFlashBag()->add('danger', "Account konnte nicht gelöscht werden.");
            }

            $accountRepository->remove($account, true);
            $this->session->getFlashBag()->add('success', 'Dein Account wurde erfolgreich gelöscht.');
        } else {
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Ungültiges CSRF-Token.');
        }

        return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
    }

    /**
     * @Route("/account/delete/{id}", name="app_account_delete_unactive", methods={"POST"})
     */
    public function deleteUnactive(string $id, Request $request, AccountRepository $accountRepository): Response
    {
        $csrfId = $id / 854;

        // Account anhand der meta_id finden
        $account = $accountRepository->findOneBy(['id' => $csrfId]);

        // Prüfen, ob der Account existiert
        if (!$account) {
            $this->session->getFlashBag()->add('danger', "Account $csrfId konnte nicht gefunden werden.");
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            $this->session->getFlashBag()->add('danger', 'Du hast keine Berechtigung, diesen Account zu löschen.');
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        // CSRF-Token validieren und Account löschen
        if ($this->isCsrfTokenValid('delete' . $id, $request->request->get('_token'))) {
            $accountRepository->remove($account, true);
            $this->session->getFlashBag()->add('success', 'Dein Account wurde erfolgreich gelöscht.');
        } else {
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Ungültiges CSRF-Token.');
        }

        return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
    }

    private function encryptPassword(string $password, string $key): string
    {
        $iv = random_bytes(16); // Initialisierungsvektor (16 Bytes für AES-256)

        // Verwende OPENSSL_RAW_DATA, um den verschlüsselten Text in Binärform zu erhalten
        $encrypted = openssl_encrypt($password, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

        // Füge IV und verschlüsselten Text zusammen und kodiere das Ergebnis in Base64
        return base64_encode($iv . $encrypted);
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

    /**
     * @Route("/account/{meta_id}/transfer-denies", name="app_account_transfer_denies", methods={"GET"})
     */
    public function transferToDenies(
        Account $account,
        DeniesClient $deniesClient,
        AccountRepository $accountRepository
    ): Response
    {
        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            $this->session->getFlashBag()->add('danger', 'Keine Berechtigung.');
            return $this->redirectToRoute('app_account_index');
        }

        if (!$this->isGranted('ROLE_ADMIN')) {
            $this->session->getFlashBag()->add('danger', 'Nur für Administratoren verfügbar.');
            return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getMetaId()]);
        }

        try {
            $account->setHost('denies');
            $account->setMetaId($account->getLogin());
            $response = $deniesClient->addAccount($account);

            if(isset($response->data->accountNumber) && strlen($response->data->accountNumber) > 1) {
                $this->addFlash('success', 'Account '. $response->data->accountNumber .' wurde erfolgreich zu Denies übertragen.');
                $account->setMetaId($response->data->accountNumber);
            } else {
                if (isset($response->error) && strlen($response->error) > 1) {
                    $this->addFlash('danger', strip_tags($response->error));
                } else {
                    $this->addFlash('danger', 'Account-Übertragung fehlgeschlagen.');
                }
            }
        } catch (\Exception $e) {
            $this->addFlash('danger', 'Fehler beim Übertragen: ' . $e->getMessage());
        }

        $accountRepository->add($account, true);

        return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getLogin()]);
    }

    /**
     * @Route("/account/{meta_id}/update", name="app_account_update", methods={"GET", "POST"})
     */
    public function update(
        string $meta_id,
        AccountRepository $accountRepository,
        DeniesClient $deniesClient,
        DuplikiumClient $duplikiumClient,
        OrderRepository $orderRepository,
        EntityManagerInterface $entityManager
    ): Response {
        $account = $accountRepository->findOneBy(['meta_id' => $meta_id]);
        if (!$account) {
            $account = $accountRepository->findOneBy(['login' => $meta_id]);
        }

        if (!$account || ($account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN'))) {
            $this->addFlash('danger', 'Account nicht gefunden.');
            return $this->redirectToRoute('app_account_index');
        }

        try {
            $this->refreshAccountStats($account, $deniesClient, $duplikiumClient, $accountRepository, $orderRepository, $entityManager);
            
            try {
                $entityManager->flush();
            } catch (\Exception $e) {
                error_log("Update Account Flush Failed: " . $e->getMessage());
            }

            $this->addFlash('success', 'Account wurde erfolgreich aktualisiert.');
        } catch (\Exception $e) {
            $this->addFlash('danger', 'Account-Aktualisierung fehlgeschlagen: ' . $e->getMessage());
        }

        if($account->getHost() == "denies") {
            return $this->redirectToRoute('app_account_show', ['meta_id' =>  $account->getLogin()], Response::HTTP_SEE_OTHER);
        }
        else {
            return $this->redirectToRoute('app_account_show', ['meta_id' =>  $account->getMetaId()], Response::HTTP_SEE_OTHER);
        }
    }

    /**
     * Private helper to refresh account statistics from external APIs
     */
    private function refreshAccountStats(
        Account $account,
        DeniesClient $deniesClient,
        DuplikiumClient $duplikiumClient,
        AccountRepository $accountRepository,
        OrderRepository $orderRepository,
        EntityManagerInterface $entityManager
    ): void {
        $now = new \DateTime();

        if (!$account->getHost()) {
            $account->setHost('duplikium');
        }

        if ($account->getHost() == 'denies') {
            try {
                $response = $deniesClient->getAccount($account);

                if ($response->code != 200) {
                    throw new \Exception('Denies API error: ' . ($response->message ?? 'Unknown error'));
                }

                $accountData = $response->data[0] ?? $response->data->data[0] ?? null;

                if (!$accountData) {
                    throw new \Exception('Denies API error: Account data not found in response');
                }

                $account->setEquity((float)($accountData->equity ?? 0));
                $account->setBalance((float)($accountData->balance ?? 0));
                
                $apiDateStr = $accountData->updated_at ?? $accountData->updatedAt ?? null;
                if ($apiDateStr) {
                    if (!str_contains($apiDateStr, 'Z') && !str_contains($apiDateStr, '+')) {
                        $apiDateStr .= 'Z';
                    }
                    $apiUpdatedAt = new \DateTime($apiDateStr);
                    $account->setLastUpdate($apiUpdatedAt);

                    $nowUTC = new \DateTime('now', new \DateTimeZone('UTC'));
                    $diff = $nowUTC->getTimestamp() - $apiUpdatedAt->getTimestamp();

                    if ($diff > 300) { // 5 minutes
                        $account->setError('STÖRUNG');
                        $account->setIsActive(false);
                    } else {
                        $account->setError('');
                        $account->setIsActive(true);
                    }
                }

                // --- Position Synchronization for Denies ---
                $deniesAccountId = $deniesClient->getAccountIdByLogin($account->getLogin());
                if ($deniesAccountId) {
                    $apiPositions = $deniesClient->getOpenPositions($deniesAccountId);
                    $localOpenOrders = $orderRepository->findBy(['account' => $account, 'state' => 1]);

                    $apiTickets = [];

                    foreach ($apiPositions as $apiPos) {
                        $ticket = (int)($apiPos->order_ticket ?? $apiPos->ticket ?? $apiPos->id ?? 0);
                        if (!$ticket) continue;
                        $apiTickets[] = $ticket;

                        // Sync local order data
                        $localOrder = $orderRepository->findOneBy(['ticket' => $ticket, 'account' => $account]);
                        if (!$localOrder) {
                            $localOrder = new Order();
                            $localOrder->setTicket($ticket);
                            $localOrder->setAccount($account);
                            $localOrder->setLogin($account->getLogin());
                            $localOrder->setState(1); // Open
                        }

                        // Update/Set properties including Open Time
                        if (isset($apiPos->order_open_at)) {
                            $localOrder->setOpenTime(new \DateTime($apiPos->order_open_at));
                        }
                        if (isset($apiPos->order_symbol)) {
                            $localOrder->setSymbol($apiPos->order_symbol);
                        }
                        if (isset($apiPos->order_lot)) {
                            $localOrder->setVolume((float)$apiPos->order_lot);
                        }
                        if (isset($apiPos->order_price)) {
                            $localOrder->setOpenPrice((float)$apiPos->order_price);
                            $localOrder->setPrice((float)$apiPos->order_price);
                        }
                        if (isset($apiPos->order_type)) {
                            // Map type: 'Buy' -> 1, 'Sell' -> 0 (based on show.html.twig mapping)
                            $localOrder->setCmd($apiPos->order_type === 'Buy' ? 1 : 0);
                        }
                        if (isset($apiPos->order_profit)) {
                            $localOrder->setProfit((float)$apiPos->order_profit);
                        }
                        $entityManager->persist($localOrder);
                    }

                    // Close local orders that are no longer on the server
                    foreach ($localOpenOrders as $localOrder) {
                        if (!in_array($localOrder->getTicket(), $apiTickets)) {
                            $localOrder->setState(2); // Closed
                            $localOrder->setCloseTime($now);
                            $entityManager->persist($localOrder);
                        }
                    }
                    // Final flush is handled by the caller
                    // --- Step 2: Sync Closed Orders (History) for Chart ---
                    $closedOrders = $deniesClient->getClosedOrders($deniesAccountId);
                    error_log("Denies History Sync [{$account->getLogin()}]: Found " . count($closedOrders) . " closed orders.");
                    
                    foreach ($closedOrders as $apiOrder) {
                        $ticket = (int)($apiOrder->order_ticket ?? $apiOrder->ticket ?? $apiOrder->id ?? 0);
                        if (!$ticket) continue;

                        $localOrder = $orderRepository->findOneBy(['ticket' => $ticket, 'account' => $account]);
                        if (!$localOrder) {
                            $localOrder = new Order();
                            $localOrder->setTicket($ticket);
                            $localOrder->setAccount($account);
                            $localOrder->setLogin($account->getLogin());
                            // error_log("  -> New closed order created: $ticket");
                        }

                        $localOrder->setState(2); // Always closed in this loop
                        
                        if (isset($apiOrder->order_open_at)) $localOrder->setOpenTime(new \DateTime($apiOrder->order_open_at));
                        if (isset($apiOrder->order_close_at)) $localOrder->setCloseTime(new \DateTime($apiOrder->order_close_at));
                        if (isset($apiOrder->order_symbol)) $localOrder->setSymbol($apiOrder->order_symbol);
                        if (isset($apiOrder->order_lot)) $localOrder->setVolume((float)$apiOrder->order_lot);
                        if (isset($apiOrder->order_price)) $localOrder->setOpenPrice((float)$apiOrder->order_price);
                        if (isset($apiOrder->order_close_price)) $localOrder->setClosePrice((float)$apiOrder->order_close_price);
                        if (isset($apiOrder->order_type)) $localOrder->setCmd($apiOrder->order_type === 'Buy' ? 1 : 0);
                        if (isset($apiOrder->order_profit)) $localOrder->setProfit((float)$apiOrder->order_profit);

                        $entityManager->persist($localOrder);
                    }
                    // --- End History Sync ---
                }
                // --- End Position Sync ---

            } catch (\Exception $e) {
                // Log and expose specific error for debugging
                $msg = $e->getMessage();
                error_log("Denies Refresh Failed [{$account->getLogin()}]: " . $msg);
                $account->setError('err: ' . substr($msg, 0, 40));
            }
            $account->setLastUpdate($now);
            $accountRepository->add($account, false);
        } else {
            $response = $duplikiumClient->getAccount($account->getMetaId());

            if (!isset($response->accounts[0]) || $response->accounts[0]->status != 1) {
                $errorMsg = $response->accounts[0]->state ?? 'Account not found or not initialized';
                throw new \Exception('Duplikium API error: ' . $errorMsg);
            }

            $account->setEquity($response->accounts[0]->equity);
            $account->setBalance($response->accounts[0]->balance);
            $account->setError('');
            $account->setIsActive($response->accounts[0]->status == 1 ? 1 : 0);
            $account->setLastUpdate($now);

            $accountRepository->add($account, false);
        }
    }
}