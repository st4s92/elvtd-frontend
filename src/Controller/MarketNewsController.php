<?php

namespace App\Controller;

use App\Service\NewsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class MarketNewsController extends AbstractController
{
    private $newsService;

    public function __construct(NewsService $newsService)
    {
        $this->newsService = $newsService;
    }

    /**
     * @Route("/market-news", name="app_market_news")
     */
    public function index(): Response
    {
        $newsItems = $this->newsService->getNews();

        return $this->render('market_news/index.html.twig', [
            'newsItems' => $newsItems,
        ]);
    }
}
