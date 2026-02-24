<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\Security;

class LocaleSwitcher
{
    private RequestStack $requestStack;
    private Security $security;

    public function __construct(RequestStack $requestStack, Security $security)
    {
        $this->requestStack = $requestStack;
        $this->security = $security;
    }

    public function setLocale(): void
    {
        $user = $this->security->getUser();
        $locale = $user ? $user->getLanguage() : 'de'; // Fallback to default_locale
        $request = $this->requestStack->getCurrentRequest();
        if ($request) {
            $request->setLocale(strtolower($locale)); // Normalize to lowercase
        }
    }
}