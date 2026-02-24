<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class SentimentController extends AbstractController
{
    /**
     * @Route("/sentiment", name="app_sentiment")
     */
    public function index(): Response
    {


        return $this->render('pages/sentiment.html.twig', [
            'controller_name' => 'Sentiment']);
    }
}
