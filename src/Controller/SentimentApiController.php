<?php

namespace App\Controller;

use App\Service\MyFxBookPublicService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class SentimentApiController extends AbstractController
{
    private MyFxBookPublicService $myFxBookService;

    public function __construct(MyFxBookPublicService $myFxBookService)
    {
        $this->myFxBookService = $myFxBookService;
    }

    #[Route('/api/myfxbook/outlook', name: 'api_myfxbook_outlook', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $data = $this->myFxBookService->getCommunityOutlook();

        if (isset($data['error'])) {
            return $this->json([
                'error' => true, 
                'message' => $data['message'],
                'symbols' => []
            ], 500);
        }

        return $this->json([
            'error' => false,
            'symbols' => $data
        ]);
    }
}
