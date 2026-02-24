<?php

namespace App\EventListener;

use App\Service\LocaleSwitcher;
use Symfony\Component\HttpKernel\Event\RequestEvent;

class LocaleListener
{
    private LocaleSwitcher $localeSwitcher;

    public function __construct(LocaleSwitcher $localeSwitcher)
    {
        $this->localeSwitcher = $localeSwitcher;
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if ($event->isMainRequest()) { // Only for main requests
            $this->localeSwitcher->setLocale();
        }
    }
}