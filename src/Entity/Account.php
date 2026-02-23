<?php

namespace App\Entity;

use App\Repository\AccountRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

/**
 * @ORM\Entity(repositoryClass=AccountRepository::class)
 */
class Account
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $name;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $platform;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $broker;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $tradeServer;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $login;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $password;

    /**
     * @ORM\Column(type="float", precision=10, scale=2, nullable=false)
     */
    private $balance = 0.00;

    /**
     * @ORM\Column(type="float", precision=10, scale=2, nullable=false)
     */
    private $equity = 0.00;

    /**
     * @ORM\Column(type="boolean", nullable=false)
     */
    private $isActive = false;

    /**
     * @ORM\ManyToOne(targetEntity=User::class, inversedBy="accounts")
     * @ORM\JoinColumn(nullable=false)
     */
    private $user;

    /**
     * @ORM\OneToMany(targetEntity=Order::class, mappedBy="account", cascade={"persist", "remove"})
     */
    private $orders;

    /**
     * @ORM\Column(type="integer", nullable=true)
     */
    private $trades;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $withdrawals;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $bestTrade;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $worstTrade;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $commissions;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $dailyGain;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $monthlyGain;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $cagr;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $equityPercent;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $expectancy;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $gain;

    /**
     * @ORM\Column(type="integer", nullable=true)
     */
    private $longTrades;

    /**
     * @ORM\Column(type="integer", nullable=true)
     */
    private $shortTrades;

    /**
     * @ORM\Column(type="integer", nullable=true)
     */
    private $longWonTrades;

    /**
     * @ORM\Column(type="integer", nullable=true)
     */
    private $shortWonTrades;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $longWonTradesPercent;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $shortWonTradesPercent;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $maxDrawdown;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $lots;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $profit;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $deposits;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $absoluteGain;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $profitFactor;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $sharpeRatio;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $averageWin;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $averageLoss;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $wonTradesPercent;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $lostTradesPercent;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $zScore;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $probability;

    /**
     * @ORM\Column(type="json", nullable=true)
     */
    private $dailyGrowth;

    /**
     * @ORM\Column(type="json", nullable=true)
     */
    private $monthlyAnalytics;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $totalTradeMarketValue;

    /**
     * @ORM\Column(type="integer", nullable=true)
     */
    private $type;

    /** @ORM\ManyToMany(targetEntity="Agent", inversedBy="accounts") */
    private $agents;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private $meta_id;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $last_update;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private $ctraderAccessToken;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private $ctraderRefreshToken;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $ctraderTokenExpiresAt;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private $host;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private $error;

    public function __construct()
    {
        $this->orders = new ArrayCollection();
        $this->agents = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getPlatform(): ?string
    {
        return $this->platform;
    }

    public function setPlatform(string $platform): self
    {
        $this->platform = $platform;

        return $this;
    }

    public function getBroker(): ?string
    {
        return $this->broker;
    }

    public function setBroker(string $broker): self
    {
        $this->broker = $broker;

        return $this;
    }

    public function getTradeServer(): ?string
    {
        return $this->tradeServer;
    }

    public function setTradeServer(string $tradeServer): self
    {
        $this->tradeServer = $tradeServer;

        return $this;
    }

    public function getLogin(): ?string
    {
        return $this->login;
    }

    public function setLogin(string $login): self
    {
        $this->login = $login;

        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;

        return $this;
    }

    public function getBalance(): ?float
    {
        return $this->balance;
    }

    public function setBalance(float $balance): self
    {
        $this->balance = $balance;

        return $this;
    }

    public function getEquity(): ?float
    {
        return $this->equity;
    }

    public function setEquity(float $equity): self
    {
        $this->equity = $equity;

        return $this;
    }

    public function getIsActive(): ?bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;

        return $this;
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

    /**
     * @return Collection<int, Order>
     */
    public function getOrders(): Collection
    {
        return $this->orders;
    }

    public function addOrder(Order $order): self
    {
        if (!$this->orders->contains($order)) {
            $this->orders[] = $order;
            $order->setAccount($this);
        }

        return $this;
    }

    public function removeOrder(Order $order): self
    {
        if ($this->orders->removeElement($order)) {
            // set the owning side to null (unless already changed)
            if ($order->getAccount() === $this) {
                $order->setAccount(null);
            }
        }

        return $this;
    }

    public function getTrades(): ?int
    {
        return $this->trades;
    }

    public function setTrades(?int $trades): self
    {
        $this->trades = $trades;

        return $this;
    }

    public function getWithdrawals(): ?float
    {
        return $this->withdrawals;
    }

    public function setWithdrawals(?float $withdrawals): self
    {
        $this->withdrawals = $withdrawals;

        return $this;
    }

    public function getBestTrade(): ?float
    {
        return $this->bestTrade;
    }

    public function setBestTrade(?float $bestTrade): self
    {
        $this->bestTrade = $bestTrade;

        return $this;
    }

    public function getWorstTrade(): ?float
    {
        return $this->worstTrade;
    }

    public function setWorstTrade(?float $worstTrade): self
    {
        $this->worstTrade = $worstTrade;

        return $this;
    }

    public function getCommissions(): ?float
    {
        return $this->commissions;
    }

    public function setCommissions(?float $commissions): self
    {
        $this->commissions = $commissions;

        return $this;
    }

    public function getDailyGain(): ?float
    {
        return $this->dailyGain;
    }

    public function setDailyGain(?float $dailyGain): self
    {
        $this->dailyGain = $dailyGain;

        return $this;
    }

    public function getMonthlyGain(): ?float
    {
        return $this->monthlyGain;
    }

    public function setMonthlyGain(?float $monthlyGain): self
    {
        $this->monthlyGain = $monthlyGain;

        return $this;
    }

    public function getCagr(): ?float
    {
        return $this->cagr;
    }

    public function setCagr(?float $cagr): self
    {
        $this->cagr = $cagr;

        return $this;
    }

    public function getEquityPercent(): ?float
    {
        return $this->equityPercent;
    }

    public function setEquityPercent(?float $equityPercent): self
    {
        $this->equityPercent = $equityPercent;

        return $this;
    }

    public function getExpectancy(): ?float
    {
        return $this->expectancy;
    }

    public function setExpectancy(?float $expectancy): self
    {
        $this->expectancy = $expectancy;

        return $this;
    }

    public function getGain(): ?float
    {
        return $this->gain;
    }

    public function setGain(?float $gain): self
    {
        $this->gain = $gain;

        return $this;
    }

    public function getLongTrades(): ?int
    {
        return $this->longTrades;
    }

    public function setLongTrades(?int $longTrades): self
    {
        $this->longTrades = $longTrades;

        return $this;
    }

    public function getShortTrades(): ?int
    {
        return $this->shortTrades;
    }

    public function setShortTrades(?int $shortTrades): self
    {
        $this->shortTrades = $shortTrades;

        return $this;
    }

    public function getLongWonTrades(): ?int
    {
        return $this->longWonTrades;
    }

    public function setLongWonTrades(?int $longWonTrades): self
    {
        $this->longWonTrades = $longWonTrades;

        return $this;
    }

    public function getShortWonTrades(): ?int
    {
        return $this->shortWonTrades;
    }

    public function setShortWonTrades(?int $shortWonTrades): self
    {
        $this->shortWonTrades = $shortWonTrades;

        return $this;
    }

    public function getLongWonTradesPercent(): ?float
    {
        return $this->longWonTradesPercent;
    }

    public function setLongWonTradesPercent(?float $longWonTradesPercent): self
    {
        $this->longWonTradesPercent = $longWonTradesPercent;

        return $this;
    }

    public function getShortWonTradesPercent(): ?float
    {
        return $this->shortWonTradesPercent;
    }

    public function setShortWonTradesPercent(?float $shortWonTradesPercent): self
    {
        $this->shortWonTradesPercent = $shortWonTradesPercent;

        return $this;
    }

    public function getMaxDrawdown(): ?float
    {
        return $this->maxDrawdown;
    }

    public function setMaxDrawdown(?float $maxDrawdown): self
    {
        $this->maxDrawdown = $maxDrawdown;

        return $this;
    }

    public function getLots(): ?float
    {
        return $this->lots;
    }

    public function setLots(?float $lots): self
    {
        $this->lots = $lots;

        return $this;
    }

    public function getProfit(): ?float
    {
        return $this->profit;
    }

    public function setProfit(?float $profit): self
    {
        $this->profit = $profit;

        return $this;
    }

    public function getDeposits(): ?float
    {
        return $this->deposits;
    }

    public function setDeposits(?float $deposits): self
    {
        $this->deposits = $deposits;

        return $this;
    }

    public function getAbsoluteGain(): ?float
    {
        return $this->absoluteGain;
    }

    public function setAbsoluteGain(?float $absoluteGain): self
    {
        $this->absoluteGain = $absoluteGain;

        return $this;
    }

    public function getProfitFactor(): ?float
    {
        return $this->profitFactor;
    }

    public function setProfitFactor(?float $profitFactor): self
    {
        $this->profitFactor = $profitFactor;

        return $this;
    }

    public function getSharpeRatio(): ?float
    {
        return $this->sharpeRatio;
    }

    public function setSharpeRatio(?float $sharpeRatio): self
    {
        $this->sharpeRatio = $sharpeRatio;

        return $this;
    }

    public function getAverageWin(): ?float
    {
        return $this->averageWin;
    }

    public function setAverageWin(?float $averageWin): self
    {
        $this->averageWin = $averageWin;

        return $this;
    }

    public function getAverageLoss(): ?float
    {
        return $this->averageLoss;
    }

    public function setAverageLoss(?float $averageLoss): self
    {
        $this->averageLoss = $averageLoss;

        return $this;
    }

    public function getWonTradesPercent(): ?float
    {
        return $this->wonTradesPercent;
    }

    public function setWonTradesPercent(?float $wonTradesPercent): self
    {
        $this->wonTradesPercent = $wonTradesPercent;

        return $this;
    }

    public function getLostTradesPercent(): ?float
    {
        return $this->lostTradesPercent;
    }

    public function setLostTradesPercent(?float $lostTradesPercent): self
    {
        $this->lostTradesPercent = $lostTradesPercent;

        return $this;
    }

    public function getZScore(): ?float
    {
        return $this->zScore;
    }

    public function setZScore(?float $zScore): self
    {
        $this->zScore = $zScore;

        return $this;
    }

    public function getProbability(): ?float
    {
        return $this->probability;
    }

    public function setProbability(?float $probability): self
    {
        $this->probability = $probability;

        return $this;
    }

    public function getDailyGrowth(): ?array
    {
        return $this->dailyGrowth;
    }

    public function setDailyGrowth(?array $dailyGrowth): self
    {
        $this->dailyGrowth = $dailyGrowth;

        return $this;
    }

    public function getMonthlyAnalytics(): ?array
    {
        return $this->monthlyAnalytics;
    }

    public function setMonthlyAnalytics(?array $monthlyAnalytics): self
    {
        $this->monthlyAnalytics = $monthlyAnalytics;

        return $this;
    }

    public function getTotalTradeMarketValue(): ?float
    {
        return $this->totalTradeMarketValue;
    }

    public function setTotalTradeMarketValue(?float $totalTradeMarketValue): self
    {
        $this->totalTradeMarketValue = $totalTradeMarketValue;

        return $this;
    }

    public function getType(): ?int
    {
        return $this->type;
    }

    public function setType(?int $type): self
    {
        $this->type = $type;

        return $this;
    }

    public function getAgents(): Collection
    {
        return $this->agents;
    }

    public function addAgent(Agent $agent): self
    {
        if (!$this->agents->contains($agent)) {
            $this->agents[] = $agent;
        }
        return $this;
    }

    public function removeAgent(Agent $agent): self
    {
        if ($this->agents->contains($agent)) {
            $this->agents->removeElement($agent);
        }

        return $this;
    }

    public function removeAllAgents(): self
    {
        foreach ($this->agents as $agent) {
            $this->agents->removeElement($agent);
        }

        return $this;
    }

    /**
     * @return mixed
     */
    public function getMetaId(): ?string
    {
        return $this->meta_id;
    }

    /**
     * @param mixed $meta_id
     */
    public function setMetaId($meta_id): self
    {
        $this->meta_id = $meta_id;

        return $this;
    }

    /**
     * @return mixed
     */
    public function getLastUpdate()
    {
        return $this->last_update;
    }

    /**
     * @param mixed $last_update
     */
    public function setLastUpdate($last_update): void
    {
        $this->last_update = $last_update;
    }

    public function getCtraderAccessToken(): ?string
    {
        return $this->ctraderAccessToken;
    }

    public function setCtraderAccessToken(?string $ctraderAccessToken): self
    {
        $this->ctraderAccessToken = $ctraderAccessToken;
        return $this;
    }

    public function getCtraderRefreshToken(): ?string
    {
        return $this->ctraderRefreshToken;
    }

    public function setCtraderRefreshToken(?string $ctraderRefreshToken): self
    {
        $this->ctraderRefreshToken = $ctraderRefreshToken;
        return $this;
    }

    public function getCtraderTokenExpiresAt(): ?\DateTimeInterface
    {
        return $this->ctraderTokenExpiresAt;
    }

    public function setCtraderTokenExpiresAt(?\DateTimeInterface $ctraderTokenExpiresAt): self
    {
        $this->ctraderTokenExpiresAt = $ctraderTokenExpiresAt;
        return $this;
    }

    public function getHost(): ?string
    {
        return $this->host;
    }

    public function setHost(?string $host): self
    {
        $this->host = $host;
        return $this;
    }
    public function getError(): ?string
    {
        return $this->error;
    }

    public function setError(?string $error): self
    {
        $this->error = $error;
        return $this;
    }
}