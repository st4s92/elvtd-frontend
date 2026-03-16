<?php

namespace App\Controller;

use App\Entity\Account;
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

    /**
     * @Route("/admin_account", name="app_admin_account_index", methods={"GET"})
     */
    public function admin_account(AccountRepository $accountRepository, OrderRepository $orderRepository, UserRepository $userRepository): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        // Alle Accounts des aktuellen Nutzers finden
        $accounts = $accountRepository->findAll();
        $users = $userRepository->findAll();

        // Hole alle offenen Positionen
        $allOrders = [];
        $openPositions = array_filter($allOrders, fn($order) => $order->getState() === 1);

        $account = new Account();
        $form = $this->createForm(AccountType::class, $account);

        // Berechne die Anzahl der aktiven Benutzer
        $now = new DateTime();
        $thirtyMinutesAgo = (clone $now)->modify('-30 minutes');
        $twentyFourHoursAgo = (clone $now)->modify('-24 hours');

        $activeLast30Min = 0;
        $activeLast24h = 0;

        foreach ($users as $user) {
            $lastLogin = $user->getLastLogin();
            if ($lastLogin instanceof DateTime && $lastLogin >= $thirtyMinutesAgo) {
                $activeLast30Min++;
            }
            if ($lastLogin instanceof DateTime && $lastLogin >= $twentyFourHoursAgo) {
                $activeLast24h++;
            }
        }

        return $this->render('account/index.html.twig', [
            'accounts' => $accounts,
            'users' => $users,
            'openPositions' => $openPositions,
            'form' => $form->createView(),
            'admin_view' => true,
            'activeLast30Min' => $activeLast30Min,
            'activeLast24h' => $activeLast24h,
        ]);
    }

    /**
     * @Route("/admin_account_error", name="app_admin_account_error", methods={"GET"})
     */
    public function admin_account_error(AccountRepository $accountRepository, OrderRepository $orderRepository, UserRepository $userRepository): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        // Alle Accounts des aktuellen Nutzers finden
        $accounts = $accountRepository->createQueryBuilder('a')
            ->where("a.error != ''")
            ->getQuery()
            ->getResult();        
        $users = $userRepository->findAll();

        // Hole alle offenen Positionen
        $allOrders = [];
        $openPositions = array_filter($allOrders, fn($order) => $order->getState() === 1);

        $account = new Account();
        $form = $this->createForm(AccountType::class, $account);

        // Berechne die Anzahl der aktiven Benutzer
        $now = new DateTime();
        $thirtyMinutesAgo = (clone $now)->modify('-30 minutes');
        $twentyFourHoursAgo = (clone $now)->modify('-24 hours');

        $activeLast30Min = 0;
        $activeLast24h = 0;

        foreach ($users as $user) {
            $lastLogin = $user->getLastLogin();
            if ($lastLogin instanceof DateTime && $lastLogin >= $thirtyMinutesAgo) {
                $activeLast30Min++;
            }
            if ($lastLogin instanceof DateTime && $lastLogin >= $twentyFourHoursAgo) {
                $activeLast24h++;
            }
        }

        return $this->render('account/index.html.twig', [
            'accounts' => $accounts,
            'users' => $users,
            'openPositions' => $openPositions,
            'form' => $form->createView(),
            'admin_view' => true,
            'activeLast30Min' => $activeLast30Min,
            'activeLast24h' => $activeLast24h,
        ]);
    }

    /**
     * @Route("/account", name="app_account_index", methods={"GET"})
     */
    public function index(
        AccountRepository $accountRepository,
        OrderRepository $orderRepository,
        EntityManagerInterface $entityManager,
        DeniesClient $deniesClient,
        DuplikiumClient $duplikiumClient
    ): Response
    {
        // Last Login aktualisieren
        $user = $this->getUser();
        $user->setLastLogin(new DateTime());
        $entityManager = $this->getDoctrine()->getManager();
        $entityManager->persist($user);
        $entityManager->flush();

        // Hole alle Accounts des aktuellen Benutzers
        $accounts = $accountRepository->findBy(['user' => $this->getUser()]);

        // Automatische Aktualisierung, wenn das letzte Update länger als 1 Minute her ist
        $now = new \DateTime();
        foreach ($accounts as $account) {
            $lastUpdate = $account->getLastUpdate();
            if (!$lastUpdate || ($now->getTimestamp() - $lastUpdate->getTimestamp()) > 60) {
                try {
                    $this->refreshAccountStats($account, $deniesClient, $duplikiumClient, $accountRepository);
                } catch (\Exception $e) {
                    // Fehler beim automatischen Update ignorieren, um die Anzeige nicht zu blockieren
                }
            }
        }

        // Hole alle offenen Positionen
        $allOrders = $orderRepository->findBy(['account' => $accounts]);
        $openPositions = array_filter($allOrders, fn($order) => $order->getState() === 1);

        // Berechne dailyGrowth für jeden Account
        foreach ($accounts as $account) {
            if ($account->getHost() == 'duplikium') {
                $dailyGrowth = [];
                $closedPositions = array_filter($allOrders, fn($order) => $order->getAccount() === $account && !in_array($order->getState(), [0, 1]));

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

                // Setze die berechneten dailyGrowth-Daten am Account-Objekt
                $account->setDailyGrowth($dailyGrowth); // Wir nehmen an, dass es eine Methode setDailyGrowth gibt
            }
        }

        return $this->render('account/index.html.twig', [
            'accounts' => $accounts,
            'openPositions' => $openPositions,
            'form' => $this->createForm(AccountType::class, new Account())->createView(),
        ]);
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
    public function authCtraderCallback(Request $request, AccountRepository $accountRepository, EntityManagerInterface $entityManager, DuplikiumClient $duplikiumClient): Response
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
        $account->setCtraderAccessToken($tokenData['access_token']);
        $account->setCtraderRefreshToken($tokenData['refresh_token']);
        $account->setCtraderTokenExpiresAt((new \DateTime())->modify('+'.$tokenData['expires_in'].' seconds'));

        $response = $duplikiumClient->addAccount($account);

        if (isset($response->account->account_id) && strlen($response->account->account_id) > 1) {
            $this->addFlash('success', 'cTrader wurde erfolgreich verbunden.');

            $account->setMetaId($response->account->account_id);
            $account->setBalance($response->account->balance);
            $account->setEquity($response->account->equity);
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
            $account->setType(3);

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

            if($this->isGranted('ROLE_ADMIN')) {
                $account->setHost('denies');
                $response = $deniesClient->addAccount($account);
            }
            else {
                $account->setHost('duplikium');
                $response = $duplikiumClient->addAccount($account);
            }

            if($account->getHost() == 'denies' && isset($response->data->accountNumber) && strlen($response->data->accountNumber) > 1) {
                $this->addFlash('success', 'Acount '. $response->data->accountNumber .' wurde erfolgreich verbunden.');
                $account->setMetaId($response->data->accountNumber);

                $account->setHost('denies');

                // Account in die Datenbank speichern
                $accountRepository->add($account, true);    
            }
            elseif($account->getHost() == 'duplikium' && isset($response->account->account_id) && strlen($response->account->account_id) > 1) {
                $this->addFlash('success', 'Acount '. $response->account->account_id .' wurde erfolgreich verbunden.');

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
    public function show(Account $account, OrderRepository $orderRepository, AccountAgentSubscriptionRepository $accountAgentSubscriptionRepository, AgentRepository $agentRepository, MetaApiClient $metaApiClient, DuplikiumClient $duplikiumClient, DeniesClient $deniesClient, AccountRepository $accountRepository): Response
    {
        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            // Weiterleiten auf die Account-Übersicht
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Account existiert nicht oder gehört einem anderen User.');
            return $this->redirectToRoute('app_account_index');
        }

        // Automatische Aktualisierung, wenn das letzte Update länger als 1 Minute her ist
        $now = new \DateTime();
        $lastUpdate = $account->getLastUpdate();
        if (!$lastUpdate || ($now->getTimestamp() - $lastUpdate->getTimestamp()) > 60) {
            try {
                $this->refreshAccountStats($account, $deniesClient, $duplikiumClient, $accountRepository);
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
    public function delete(string $meta_id, Request $request, AccountRepository $accountRepository, MetaApiClient $metaApiClient, DuplikiumClient $duplikiumClient): Response
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
                if ($account->getHost() == "duplikium") {
                    $duplikiumClient->deleteAccount($meta_id);
                }
                else {
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
        Request $request,
        Account $account,
        DeniesClient $deniesClient,
        DuplikiumClient $duplikiumClient,
        AccountRepository $accountRepository
    ): Response
    {

        // Prüfen, ob der Account dem aktuellen Benutzer gehört
        if (!$account || $account->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            // Weiterleiten auf die Account-Übersicht
            $this->session->getFlashBag()->add('danger', 'Account-Validierung fehlgeschlagen. Account existiert nicht oder gehört einem anderen User.');
            return $this->redirectToRoute('app_account_index');
        }

        // Rate-Limit: max. 1 Update pro Minute
        $now = new \DateTime();
        $lastUpdate = $account->getLastUpdate();

        if ($lastUpdate instanceof \DateTimeInterface) {
            $diff = $now->getTimestamp() - $lastUpdate->getTimestamp();
            if ($diff < 60) { // Weniger als 60 Sekunden her
                $secondsLeft = 60 - $diff;
                $this->addFlash('warning', "Bitte warte noch $secondsLeft Sekunden, bevor du erneut aktualisierst.");
                return $this->redirectToRoute('app_account_show', ['meta_id' => $account->getMetaId()]);
            }
        }

        try {
            $this->refreshAccountStats($account, $deniesClient, $duplikiumClient, $accountRepository);
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
        AccountRepository $accountRepository
    ): void {
        $now = new \DateTime();

        if (!$account->getHost()) {
            $account->setHost('duplikium');
        }

        if ($account->getHost() == 'denies') {
            $response = $deniesClient->getAccount($account);

            if ($response->code != 200) {
                throw new \Exception('Denies API error: ' . ($response->message ?? 'Unknown error'));
            }

            $account->setEquity($response->data->equity);
            $account->setBalance($response->data->balance);
            $account->setError('');
            $account->setIsActive($response->data->status == 200 ? 1 : 0);
            $account->setLastUpdate($now);

            $accountRepository->add($account, true);
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

            $accountRepository->add($account, true);
        }
    }
}