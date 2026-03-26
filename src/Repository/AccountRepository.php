<?php

// src/Repository/AccountRepository.php

namespace App\Repository;

use App\Entity\Account;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Account>
 *
 * @method Account|null find($id, $lockMode = null, $lockVersion = null)
 * @method Account|null findOneBy(array $criteria, array $orderBy = null)
 * @method Account[]    findAll()
 * @method Account[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class AccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Account::class);
    }

    public function add(Account $entity, bool $flush = false): void
    {
        $this->_em->persist($entity);
        if ($flush) {
            $this->_em->flush();
        }
    }

    public function remove(Account $entity, bool $flush = false): void
    {
        $this->_em->remove($entity);
        if ($flush) {
            $this->_em->flush();
        }
    }

    /**
     * Returns distinct trade servers for a given platform, optionally filtered by search term.
     *
     * @return string[]
     */
    public function findDistinctServersByPlatform(string $platform, string $search = ''): array
    {
        $qb = $this->createQueryBuilder('a')
            ->select('DISTINCT a.tradeServer')
            ->where('a.platform = :platform')
            ->andWhere('a.tradeServer IS NOT NULL')
            ->andWhere('a.tradeServer != :empty')
            ->setParameter('platform', $platform)
            ->setParameter('empty', '')
            ->orderBy('a.tradeServer', 'ASC');

        if ($search !== '') {
            $qb->andWhere('LOWER(a.tradeServer) LIKE :search')
               ->setParameter('search', '%' . strtolower($search) . '%');
        }

        $qb->setMaxResults(20);

        return array_column($qb->getQuery()->getScalarResult(), 'tradeServer');
    }
}