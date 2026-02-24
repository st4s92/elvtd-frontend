<?php

namespace App\Controller;

use App\Service\EconomicCalendarService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class EconomicCalendarController extends AbstractController
{
    private $calendarService;

    public function __construct(EconomicCalendarService $calendarService)
    {
        $this->calendarService = $calendarService;
    }

    /**
     * @Route("/economic-calendar", name="app_economic_calendar")
     */
    public function index(): Response
    {
        $events = $this->calendarService->getEvents();

        return $this->render('economic_calendar/index.html.twig', [
            'events' => $events,
        ]);
    }
}
