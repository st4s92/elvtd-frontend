<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=OrderRepository::class)
 * @ORM\Table(name="`order`")
 */
class Order
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="integer")
     */
    private $login;  // Die Kontonummer

    /**
     * @ORM\Column(type="integer")
     */
    private $ticket; // Ticket der Order

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $symbol; // Symbol der Order (z.B. EURUSD)

    /**
     * @ORM\Column(type="integer")
     */
    private $cmd; // Ordertype (Buy/Sell etc.)

    /**
     * @ORM\Column(type="float")
     */
    private $volume; // Volumen der Order

    /**
     * @ORM\Column(type="float")
     */
    private $price; // Preis der Order

    /**
     * @ORM\Column(type="float")
     */
    private $sl; // Stop Loss

    /**
     * @ORM\Column(type="float")
     */
    private $tp; // Take Profit

    /**
     * @ORM\Column(type="float")
     */
    private $open_price; // Öffnungspreis der Order

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $close_price; // Schließungspreis der Order, falls sie geschlossen wurde

    /**
     * @ORM\Column(type="integer")
     */
    private $state; // Status der Order (z.B. offen oder geschlossen)

    /**
     * @ORM\Column(type="datetime")
     */
    private $open_time; // Öffnungszeitpunkt der Order

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $close_time; // Schließungszeitpunkt der Order, falls sie geschlossen wurde

    /**
     * @ORM\ManyToOne(targetEntity=Account::class, inversedBy="orders")
     * @ORM\JoinColumn(nullable=false)
     */
    private $account;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $profit;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $success;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $gain;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLogin(): ?int
    {
        return $this->login;
    }

    public function setLogin(int $login): self
    {
        $this->login = $login;

        return $this;
    }

    public function getTicket(): ?int
    {
        return $this->ticket;
    }

    public function setTicket(int $ticket): self
    {
        $this->ticket = $ticket;

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

    public function getCmd(): ?int
    {
        return $this->cmd;
    }

    public function setCmd(int $cmd): self
    {
        $this->cmd = $cmd;

        return $this;
    }

    public function getVolume(): ?float
    {
        return $this->volume;
    }

    public function setVolume(float $volume): self
    {
        $this->volume = $volume;

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

    public function getSl(): ?float
    {
        return $this->sl;
    }

    public function setSl(float $sl): self
    {
        $this->sl = $sl;

        return $this;
    }

    public function getTp(): ?float
    {
        return $this->tp;
    }

    public function setTp(float $tp): self
    {
        $this->tp = $tp;

        return $this;
    }

    public function getOpenPrice(): ?float
    {
        return $this->open_price;
    }

    public function setOpenPrice(float $open_price): self
    {
        $this->open_price = $open_price;

        return $this;
    }

    public function getClosePrice(): ?float
    {
        return $this->close_price;
    }

    public function setClosePrice(?float $close_price): self
    {
        $this->close_price = $close_price;

        return $this;
    }

    public function getState(): ?int
    {
        return $this->state;
    }

    public function setState(int $state): self
    {
        $this->state = $state;

        return $this;
    }

    public function getOpenTime(): ?\DateTimeInterface
    {
        return $this->open_time;
    }

    public function setOpenTime(\DateTimeInterface $open_time): self
    {
        $this->open_time = $open_time;

        return $this;
    }

    public function getCloseTime(): ?\DateTimeInterface
    {
        return $this->close_time;
    }

    public function setCloseTime(?\DateTimeInterface $close_time): self
    {
        $this->close_time = $close_time;

        return $this;
    }

    public function getAccount(): ?Account
    {
        return $this->account;
    }

    public function setAccount(?Account $account): self
    {
        $this->account = $account;

        return $this;
    }

    /**
     * @return mixed
     */
    public function getProfit()
    {
        return $this->profit;
    }

    /**
     * @param mixed $profit
     */
    public function setProfit($profit): void
    {
        $this->profit = $profit;
    }

    /**
     * @return mixed
     */
    public function getSuccess()
    {
        return $this->success;
    }

    /**
     * @param mixed $success
     */
    public function setSuccess($success): void
    {
        $this->success = $success;
    }

    /**
     * @return mixed
     */
    public function getGain()
    {
        return $this->gain;
    }

    /**
     * @param mixed $gain
     */
    public function setGain($gain): void
    {
        $this->gain = $gain;
    }


}