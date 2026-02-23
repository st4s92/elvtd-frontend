<?php

namespace App\Controller;

use App\Service\MetaApiClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;

class MetapiAccountController extends AbstractController
{
    private MetaApiClient $metaApiClient;

    public function __construct(MetaApiClient $metaApiClient)
    {
        $this->metaApiClient = $metaApiClient;
    }

    #[Route('/metapiaccount/{id}', name: 'metapiaccount_show')]
    public function show(string $id): JsonResponse
    {
        $accountInfo = $this->metaApiClient->getAccountInformation($id);
        return $this->json($accountInfo);
    }

    #[Route('/metapidelete/{id}', name: 'metapiaccount_show')]
    public function delete(string $id): JsonResponse
    {
        return $this->metaApiClient->deleteAccount($id);
    }

    /**
     * @Route("/flatten_all", name="app_metapi_close_all", methods={"GET"})
     */
    public function flattenAll(Request $request): RedirectResponse
    {
        $metaId = $request->query->get('meta_id');
        $response = $this->metaApiClient->closeAll($metaId);

        var_dump($response); die;
    }
}