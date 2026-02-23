<?php

namespace App\Entity;

use App\Repository\SignalRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=SignalRepository::class)
 * @ORM\Table(name="`copytrader`")
 */
class Copytrader
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\ManyToOne(targetEntity=User::class, inversedBy="signals")
     * @ORM\JoinColumn(nullable=false)
     */
    private $user;

    /**
     * @ORM\Column(type="string", length=100)
     */
    private $symbol;

    /**
     * @ORM\Column(type="string", length=100)
     */
    private $action;

    /**
     * @ORM\Column(type="float")
     */
    private $price;

    /**
     * @ORM\Column(type="datetime_immutable")
     */
    private $createdAt;

    /**
     * @ORM\OneToMany(targetEntity=TradeLog::class, mappedBy="tradeSignal", cascade={"persist", "remove"})
     */
    private $tradeLogs;

    public function __construct()
    {
        $this->tradeLogs = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getSymbol(): ?string
    {
        return $this->symbol;
    }

    public function setSymbol(string $symbol): self
    {
        $this->symbol = $symbol;

        return $this;
    }

    public function getAction(): ?string
    {
        return $this->action;
    }

    public function setAction(string $action): self
    {
        $this->action = $action;

        return $this;
    }

    public function getPrice(): ?float
    {
        return $this->price;
    }

    public function setPrice(float $price): self
    {
        $this->price = $price;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    /**
     * @return Collection<int, TradeLog>
     */
    public function getTradeLogs(): Collection
    {
        return $this->tradeLogs;
    }

    public function addTradeLog(TradeLog $tradeLog): self
    {
        if (!$this->tradeLogs->contains($tradeLog)) {
            $this->tradeLogs[] = $tradeLog;
            $tradeLog->setTradeSignal($this);
        }

        return $this;
    }

    public function removeTradeLog(TradeLog $tradeLog): self
    {
        if ($this->tradeLogs->removeElement($tradeLog)) {
            if ($tradeLog->getTradeSignal() === $this) {
                $tradeLog->setTradeSignal(null);
            }
        }

        return $this;
    }
}