<?php

namespace App\HelpdeskBundle\Repository;

use App\Entity\User;
use App\HelpdeskBundle\Entity\Ticket;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class TicketRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Ticket::class);
    }

    // Zusätzliche Methoden, z. B. findByUser
    public function findByUser(User $user): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->setParameter('user', $user)
            ->orderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findByUserWithLatestComment($user): array
    {
        $subqb = $this->createQueryBuilder('t2')
            ->select('MAX(c2.id)')
            ->leftJoin('t2.comments', 'c2')
            ->where('t2.id = t.id');

        $qb = $this->createQueryBuilder('t')
            ->leftJoin('t.comments', 'c', 'WITH', 'c.id = (' . $subqb->getDQL() . ')')
            ->where('t.user = :user')
            ->setParameter('user', $user)
            ->addSelect('c');

        $results = $qb->getQuery()->getResult();

        // Post-process to set latest_comment
        foreach ($results as $ticket) {
            $latestComment = $ticket->getComments()->last() ?: null; // Fallback to check comments collection
            if ($latestComment) {
                $ticket->setLatestComment($latestComment);
            }
        }

        return $results;
    }

    public function findAllWithLatestComment(): array
    {
        $subqb = $this->createQueryBuilder('t2')
            ->select('MAX(c2.id)')
            ->leftJoin('t2.comments', 'c2')
            ->where('t2.id = t.id');

        $qb = $this->createQueryBuilder('t')
            ->leftJoin('t.comments', 'c', 'WITH', 'c.id = (' . $subqb->getDQL() . ')')
            ->addSelect('c');

        $results = $qb->getQuery()->getResult();

        // Post-process to set latest_comment
        foreach ($results as $ticket) {
            $latestComment = $ticket->getComments()->last() ?: null; // Fallback to check comments collection
            if ($latestComment) {
                $ticket->setLatestComment($latestComment);
            }

            /*if($ticket->getLatestComment()) {
                var_dump($ticket->getLatestComment()->getId());
                var_dump($ticket->getLatestComment()->getUser()->getUsername());
                echo '<br>';
            }*/
        }

        return $results;
    }
}