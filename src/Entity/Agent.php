<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

/**
 * @ORM\Entity()
 */
class Agent
{
    /** @ORM\Id @ORM\GeneratedValue @ORM\Column(type="integer") */
    private $id;

    /** @ORM\Column(type="string") */
    private $name;

    /** @ORM\Column(type="text", nullable=true) */
    private $description;

    /** @ORM\ManyToMany(targetEntity="Account", mappedBy="agents") */
    private $accounts;

    /** @ORM\Column(type="integer") */
    private $from_account_id;

    /** @ORM\Column(type="string") */
    private $meta_id;

    /** @ORM\Column(type="float") */
    private $default_multiplicator;

    /** @ORM\Column(type="float") */
    private $apy;

    /** @ORM\Column(type="string") */
    private $strategy;

    /** @ORM\Column(type="string") */
    private $risk;

    /** @ORM\Column(type="float") */
    private $winrate;

    /** @ORM\Column(type="float") */
    private $profit_factor;

    /** @ORM\Column(type="float") */
    private $risk_factor;

    /** @ORM\Column(type="float") */
    private $max_drawdown;

    /** @ORM\Column(type="string") */
    private $backtesting;

    /** @ORM\Column(type="integer") */
    private $backtesting_anzahl_trades;

    /** @ORM\Column(type="float") */
    private $backtesting_setback;

    /** @ORM\Column(type="integer") */
    private $avg_wins_infollow;

    /** @ORM\Column(type="integer") */
    private $users;

    /** @ORM\Column(type="string") */
    private $link_account;

    /** @ORM\Column(type="string") */
    private $youtube_link;

    /**
     * @ORM\Column(type="json", nullable=true)
     */
    private $backtesting_json;

    /**
     * @ORM\Column(type="string", nullable=true)
     */
    private $html_backtest;

    public function __construct()
    {
        $this->accounts = new ArrayCollection();
    }

    /**
     * @return mixed
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @param mixed $id
     */
    public function setId($id): void
    {
        $this->id = $id;
    }

    /**
     * @return mixed
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * @param mixed $name
     */
    public function setName($name): void
    {
        $this->name = $name;
    }

    /**
     * @return mixed
     */
    public function getDescription()
    {
        return $this->description;
    }

    /**
     * @param mixed $description
     */
    public function setDescription($description): void
    {
        $this->description = $description;
    }

    /**
     * @return mixed
     */
    public function getFromAccountId()
    {
        return $this->from_account_id;
    }

    /**
     * @param mixed $from_account_id
     */
    public function setFromAccountId($from_account_id): void
    {
        $this->from_account_id = $from_account_id;
    }

    /**
     * @return mixed
     */
    public function getMetaId()
    {
        return $this->meta_id;
    }

    /**
     * @param mixed $meta_id
     */
    public function setMetaId($meta_id): void
    {
        $this->meta_id = $meta_id;
    }

    public function getAccounts(): Collection
    {
        return $this->accounts;
    }

    /**
     * @return mixed
     */
    public function getDefaultMultiplicator()
    {
        return $this->default_multiplicator;
    }

    /**
     * @param mixed $default_multiplicator
     */
    public function setDefaultMultiplicator($default_multiplicator): void
    {
        $this->default_multiplicator = $default_multiplicator;
    }

    /**
     * @return mixed
     */
    public function getApy()
    {
        return $this->apy;
    }

    /**
     * @param mixed $apy
     */
    public function setApy($apy): void
    {
        $this->apy = $apy;
    }

    /**
     * @return mixed
     */
    public function getStrategy()
    {
        return $this->strategy;
    }

    /**
     * @param mixed $strategy
     */
    public function setStrategy($strategy): void
    {
        $this->strategy = $strategy;
    }

    /**
     * @return mixed
     */
    public function getRisk()
    {
        return $this->risk;
    }

    /**
     * @param mixed $risk
     */
    public function setRisk($risk): void
    {
        $this->risk = $risk;
    }

    /**
     * @return mixed
     */
    public function getWinrate()
    {
        return $this->winrate;
    }

    /**
     * @param mixed $winrate
     */
    public function setWinrate($winrate): void
    {
        $this->winrate = $winrate;
    }

    /**
     * @return mixed
     */
    public function getProfitFactor()
    {
        return $this->profit_factor;
    }

    /**
     * @param mixed $profit_factor
     */
    public function setProfitFactor($profit_factor): void
    {
        $this->profit_factor = $profit_factor;
    }

    /**
     * @return mixed
     */
    public function getRiskFactor()
    {
        return $this->risk_factor;
    }

    /**
     * @param mixed $risk_factor
     */
    public function setRiskFactor($risk_factor): void
    {
        $this->risk_factor = $risk_factor;
    }

    /**
     * @return mixed
     */
    public function getMaxDrawdown()
    {
        return $this->max_drawdown;
    }

    /**
     * @param mixed $max_drawdown
     */
    public function setMaxDrawdown($max_drawdown): void
    {
        $this->max_drawdown = $max_drawdown;
    }

    /**
     * @return mixed
     */
    public function getBacktesting()
    {
        return $this->backtesting;
    }

    /**
     * @param mixed $backtesting
     */
    public function setBacktesting($backtesting): void
    {
        $this->backtesting = $backtesting;
    }

    /**
     * @return mixed
     */
    public function getBacktestingAnzahlTrades()
    {
        return $this->backtesting_anzahl_trades;
    }

    /**
     * @param mixed $backtesting_anzahl_trades
     */
    public function setBacktestingAnzahlTrades($backtesting_anzahl_trades): void
    {
        $this->backtesting_anzahl_trades = $backtesting_anzahl_trades;
    }

    /**
     * @return mixed
     */
    public function getBacktestingSetback()
    {
        return $this->backtesting_setback;
    }

    /**
     * @param mixed $backtesting_setback
     */
    public function setBacktestingSetback($backtesting_setback): void
    {
        $this->backtesting_setback = $backtesting_setback;
    }

    /**
     * @return mixed
     */
    public function getAvgWinsInfollow()
    {
        return $this->avg_wins_infollow;
    }

    /**
     * @param mixed $avg_wins_infollow
     */
    public function setAvgWinsInfollow($avg_wins_infollow): void
    {
        $this->avg_wins_infollow = $avg_wins_infollow;
    }

    /**
     * @return mixed
     */
    public function getBacktestingJson()
    {
        return $this->backtesting_json;
    }

    /**
     * @param mixed $backtesting_json
     */
    public function setBacktestingJson($backtesting_json): void
    {
        $this->backtesting_json = $backtesting_json;
    }

    /**
     * @return mixed
     */
    public function getUsers()
    {
        return $this->users;
    }

    /**
     * @param mixed $users
     */
    public function setUsers($users): void
    {
        $this->users = $users;
    }

    /**
     * @return mixed
     */
    public function getLinkAccount()
    {
        return $this->link_account;
    }

    /**
     * @param mixed $link_account
     */
    public function setLinkAccount($link_account): void
    {
        $this->link_account = $link_account;
    }

    /**
     * @return mixed
     */
    public function getYoutubeLink()
    {
        return $this->youtube_link;
    }

    /**
     * @param mixed $youtube_link
     */
    public function setYoutubeLink($youtube_link): void
    {
        $this->youtube_link = $youtube_link;
    }

    /**
     * @return mixed
     */
    public function getHtmlBacktest()
    {
        return $this->html_backtest;
    }

    /**
     * @param mixed $html_backtest
     */
    public function setHtmlBacktest($html_backtest): void
    {
        $this->html_backtest = $html_backtest;
    }
}