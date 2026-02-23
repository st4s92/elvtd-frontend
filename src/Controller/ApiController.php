<?php

namespace App\Controller;

use App\Repository\SignalRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class ApiController extends AbstractController
{
    #[Route('/api/signals', name: 'api_signals')]
    public function signals(SignalRepository $signalRepository): JsonResponse
    {
        $signals = $signalRepository->findAll();
        return $this->json($signals);
    }
}