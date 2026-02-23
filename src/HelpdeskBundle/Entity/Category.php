<?php

namespace App\HelpdeskBundle\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass="App\HelpdeskBundle\Repository\CategoryRepository")
 */
class Category
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
    private $title;

    /**
     * @ORM\Column(type="string", length=50, nullable=true)
     */
    private $logo;

    /**
     * @ORM\OneToMany(targetEntity="FaqPost", mappedBy="category", cascade={"persist", "remove"})
     */
    private $faqPosts;

    public function __construct()
    {
        $this->faqPosts = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getLogo(): ?string
    {
        return $this->logo;
    }

    public function setLogo(?string $logo): self
    {
        $this->logo = $logo;
        return $this;
    }

    /**
     * @return Collection|FaqPost[]
     */
    public function getFaqPosts(): Collection
    {
        return $this->faqPosts;
    }

    public function addFaqPost(FaqPost $faqPost): self
    {
        if (!$this->faqPosts->contains($faqPost)) {
            $this->faqPosts[] = $faqPost;
            $faqPost->setCategory($this);
        }

        return $this;
    }

    public function removeFaqPost(FaqPost $faqPost): self
    {
        if ($this->faqPosts->removeElement($faqPost)) {
            // Set the owning side to null (unless already changed)
            if ($faqPost->getCategory() === $this) {
                $faqPost->setCategory(null);
            }
        }

        return $this;
    }

    public function __toString(): string
    {
        return $this->title ?? 'Unnamed Category';
    }
}