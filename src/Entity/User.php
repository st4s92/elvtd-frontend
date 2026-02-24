<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * @ORM\Entity(repositoryClass=UserRepository::class)
 * @ORM\HasLifecycleCallbacks
 * @UniqueEntity(fields={"username"}, message="Dieser Benutzername ist bereits vergeben.")
 * @UniqueEntity(fields={"email"}, message="Diese E-Mail-Adresse ist bereits registriert.")
 */
class User implements UserInterface
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="string", length=255, unique=true)
     * @Assert\NotBlank(message="Bitte gib einen Benutzernamen ein.")
     */
    private $username;

    /**
     * @ORM\Column(type="string", length=255)
     * @Assert\NotBlank(message="Bitte gib eine Email-Adresse ein.")
     */
    private $email;

    /**
     * @ORM\Column(type="string")
     */
    private $password;

    /**
     * @ORM\Column(type="json")
     */
    private $roles = [];

    /**
     * @ORM\Column(type="datetime_immutable")
     */
    private $createdAt;

    /**
     * @ORM\Column(type="datetime")
     */
    private $updatedAt;

    /**
     * @ORM\Column(type="datetime")
     */
    private $lastLogin;

    /**
     * @ORM\OneToMany(targetEntity=Signal::class, mappedBy="user", cascade={"persist", "remove"})
     */
    private $signals;

    /**
     * @ORM\OneToMany(targetEntity=Account::class, mappedBy="user")
     */
    private $accounts;

    /**
     * @ORM\Column(type="integer")
     */
    private $email_verified = 0;

    /**
     * @ORM\Column(type="integer")
     */
    private $max_accounts = 0;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $stripe_customer_id;

    /**
     * @ORM\Column(type="string", length=50, nullable=false, options={"default": "inactive"})
     */
    private $subscription_status = 'inactive';

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $subscription_end_at;

    /**
     * @ORM\Column(type="string", length=255, unique=false)
     * @Assert\NotBlank(message="Bitte gib einen Vornamen ein.")
     */
    private $firstname;

    /**
     * @ORM\Column(type="string", length=255, unique=false)
     * @Assert\NotBlank(message="Bitte gib einen Nachnamen ein.")
     */
    private $lastname;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $affiliate_code;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $resetToken;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $resetTokenExpiration;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $language;

    /**
     * @ORM\Column(type="integer")
     */
    private $darkmode = 0;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->signals = new ArrayCollection();
        $this->accounts = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;

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

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    public function setRoles(array $roles): self
    {
        $this->roles = $roles;

        return $this;
    }

    public function getSalt(): ?string
    {
        return null;
    }

    public function eraseCredentials(): void
    {
        // sensible Daten löschen
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

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): self
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getLastLogin(): ?\DateTimeInterface
    {
        return $this->lastLogin;
    }

    public function setLastLogin(\DateTimeInterface $lastLogin): self
    {
        $this->lastLogin = $lastLogin;

        return $this;
    }

    /**
     * @ORM\PrePersist
     */
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    /**
     * @ORM\PrePersist
     * @ORM\PreUpdate
     */
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTime();
    }

    /**
     * @return Collection<int, Signal>
     */
    public function getSignals(): Collection
    {
        return $this->signals;
    }

    public function addSignal(Signal $signal): self
    {
        if (!$this->signals->contains($signal)) {
            $this->signals[] = $signal;
            $signal->setUser($this);
        }

        return $this;
    }

    public function removeSignal(Signal $signal): self
    {
        if ($this->signals->removeElement($signal)) {
            if ($signal->getUser() === $this) {
                $signal->setUser(null);
            }
        }

        return $this;
    }

    public function addAccount(Account $account): self
    {
        if (!$this->accounts->contains($account)) {
            $this->accounts[] = $account;
            $account->setUser($this);
        }

        return $this;
    }

    public function removeAccount(Account $account): self
    {
        if ($this->accounts->removeElement($account)) {
            // set the owning side to null (unless already changed)
            if ($account->getUser() === $this) {
                $account->setUser(null);
            }
        }

        return $this;
    }

    public function getEmailVerified(): int
    {
        return $this->email_verified;
    }

    public function setEmailVerified(int $email_verified): void
    {
        $this->email_verified = $email_verified;
    }

    public function getAccounts()
    {
        return $this->accounts;
    }

    public function getMaxAccounts(): int
    {
        return $this->max_accounts;
    }

    public function setMaxAccounts(int $max_accounts): void
    {
        $this->max_accounts = $max_accounts;
    }

    /**
     * @return mixed
     */
    public function getStripeCustomerId()
    {
        return $this->stripe_customer_id;
    }

    /**
     * @param mixed $stripe_customer_id
     */
    public function setStripeCustomerId($stripe_customer_id): void
    {
        $this->stripe_customer_id = $stripe_customer_id;
    }

    /**
     * @return mixed
     */
    public function getSubscriptionStatus()
    {
        return $this->subscription_status;
    }

    /**
     * @param mixed $subscription_status
     */
    public function setSubscriptionStatus($subscription_status): void
    {
        $this->subscription_status = $subscription_status;
    }

    /**
     * @return mixed
     */
    public function getSubscriptionEndAt()
    {
        return $this->subscription_end_at;
    }

    /**
     * @param mixed $subscription_end_at
     */
    public function setSubscriptionEndAt($subscription_end_at): void
    {
        $this->subscription_end_at = $subscription_end_at;
    }

    public function getFirstname(): ?string
    {
        return $this->firstname;
    }

    public function setFirstname($firstname): void
    {
        $this->firstname = $firstname;
    }

    public function getLastname(): ?string
    {
        return $this->lastname;
    }

    public function setLastname($lastname): void
    {
        $this->lastname = $lastname;
    }

    public function getAffiliateCode(): ?string
    {
        return $this->affiliate_code;
    }

    public function setAffiliateCode($affiliate_code): void
    {
        $this->affiliate_code = $affiliate_code;
    }

    public function getResetToken(): ?string
    {
        return $this->resetToken;
    }

    public function setResetToken(?string $resetToken): self
    {
        $this->resetToken = $resetToken;
        return $this;
    }

    public function getResetTokenExpiration(): ?\DateTimeInterface
    {
        return $this->resetTokenExpiration;
    }

    public function setResetTokenExpiration(?\DateTimeInterface $resetTokenExpiration): self
    {
        $this->resetTokenExpiration = $resetTokenExpiration;
        return $this;
    }

    /**
     * @return mixed
     */
    public function getLanguage(): string
    {
        return $this->language ?: 'en'; // Fallback to English
    }

    /**
     * @param mixed $language
     */
    public function setLanguage($language): void
    {
        $this->language = $language;
    }

    public function getDarkmode(): int
    {
        return $this->darkmode ?: 0;
    }

    public function setDarkmode(int $darkmode): void
    {
        $this->darkmode = $darkmode;
    }
}