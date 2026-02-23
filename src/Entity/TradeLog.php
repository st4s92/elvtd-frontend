<?php

namespace App\Entity;

use App\Repository\TradeLogRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=TradeLogRepository::class)
 */
class TradeLog
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\ManyToOne(targetEntity=Signal::class, inversedBy="tradeLogs")
     * @ORM\JoinColumn(nullable=false)
     */
    private $tradeSignal;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTradeSignal(): ?Signal
    {
        return $this->tradeSignal;
    }

    public function setTradeSignal(?Signal $tradeSignal): self
    {
        $this->tradeSignal = $tradeSignal;

        return $this;
    }
}
