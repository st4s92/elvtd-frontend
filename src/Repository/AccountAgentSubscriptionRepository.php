<?php

namespace App\Repository;

use App\Entity\Account;
use App\Entity\Agent;
use Doctrine\ORM\EntityManagerInterface;

class AccountAgentSubscriptionRepository
{
    private $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    public function subscribe(Account $account, Agent $agent): void
    {
        $account->removeAllAgents($agent);
        $account->addAgent($agent);
        $this->entityManager->persist($account);
        $this->entityManager->flush();
    }

    public function unsubscribe(Account $account, Agent $agent): void
    {
        // Entferne den Agenten aus dem Account
        // $account->removeAgent($agent);
        $account->removeAllAgents($agent);

        // Speichere die Änderungen in der Datenbank
        $this->entityManager->persist($account);
        $this->entityManager->flush();
    }

    public function findOneBy(array $criteria)
    {
        // Extrahiere das Account-Objekt aus den Kriterien
        $account = $criteria['account'] ?? null;

        if (!$account) {
            return null;
        }

        // Erstelle eine native SQL-Query
        $conn = $this->entityManager->getConnection();
        $sql = 'SELECT * FROM account_agent WHERE account_id = ' .$account->getId(). ' LIMIT 1';
        $stmt = $conn->prepare($sql);

        // Hole das Ergebnis
        $result = $stmt->executeQuery()->fetchAll();

        if (count($result) < 1) {
            return null;
        }

        return $result[0]['agent_id'];
    }
}