<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Order;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method Order|null find($id, $lockMode = null, $lockVersion = null)
 * @method Order|null findOneBy(array $criteria, array $orderBy = null)
 * @method Order[]    findAll()
 * @method Order[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class OrderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Order::class);
    }

    /**
     * Beispiel einer benutzerdefinierten Methode, um Orders nach einem Status zu finden
     * @param int $status
     * @return Order[]
     */
    public function findByStatus(int $status)
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.state = :status')
            ->setParameter('status', $status)
            ->orderBy('o.open_time', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Beispiel einer benutzerdefinierten Methode, um Orders für einen bestimmten Login zu finden
     * @param int $login
     * @return Order[]
     */
    public function findByLogin(int $login)
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.login = :login')
            ->setParameter('login', $login)
            ->orderBy('o.open_time', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Beispiel einer benutzerdefinierten Methode, um eine Order nach Ticket und Login zu finden
     * @param int $ticket
     * @param int $login
     * @return Order|null
     */
    public function findOneByTicketAndLogin(int $ticket, int $login)
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.ticket = :ticket')
            ->andWhere('o.login = :login')
            ->setParameter('ticket', $ticket)
            ->setParameter('login', $login)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Find orders by user.
     *
     * @param User $user
     * @return Order[]
     */
    public function findByUser(User $user): array
    {
        return $this->createQueryBuilder('o')
            ->join('o.account', 'a')
            ->where('a.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}