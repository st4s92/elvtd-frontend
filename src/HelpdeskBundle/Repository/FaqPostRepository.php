<?php

namespace App\HelpdeskBundle\Repository;

use App\HelpdeskBundle\Entity\FaqPost;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class FaqPostRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, FaqPost::class);
    }
}