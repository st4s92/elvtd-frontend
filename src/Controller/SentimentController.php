<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class AgbController extends AbstractController
{
    /**
     * @Route("/agb", name="app_agb")
     */
    public function index(): Response
    {


        return $this->render('pages/agb.html.twig', [
            'controller_name' => 'AGB']);
    }
}
