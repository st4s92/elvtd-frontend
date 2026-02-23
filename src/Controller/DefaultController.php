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
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

class DefaultController extends AbstractController
{
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
        foreach ($userAccounts as $userAccount) {
            $user_agents = $agentRepository->findAgentsByUserAccounts(['from_account_id' => $userAccount]);
            foreach ($user_agents as $agent) {
                $accountAgentConnections[] = [
                    'account' => $userAccount,
                    'agent' => $agent,
                ];
            }
        }

        // Subscription des Nutzers laden
        $subscription = $subscriptionRepository->findOneBy(['user' => $user]);

        return $this->render('default/index.html.twig', [
            'controller_name' => 'Dashboard',
            'accounts' => $accounts,
            'agents' => $agents,
            'user_accounts' => $userAccounts,
            'account_agent_connections' => $accountAgentConnections,
            'user' => $user,
            'subscription' => $subscription
        ]);
    }
}
