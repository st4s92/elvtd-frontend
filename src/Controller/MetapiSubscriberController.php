<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use App\Entity\Account;
use App\Entity\Agent;
use App\Repository\AccountRepository;
use App\Repository\AgentRepository;
use App\Repository\AccountAgentSubscriptionRepository;
use App\Service\MetaApiClient;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Session\Flash\FlashBagInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Core\Security;

class MetapiSubscriberController extends AbstractController
{
    private MetaApiClient $metaApiClient;
    private FlashBagInterface $flashBag;
    private $accountRepo;
    private $agentRepo;
    private $subscriptionRepo;
    private UrlGeneratorInterface $urlGenerator;

    public function __construct(MetaApiClient $metaApiClient,
                                FlashBagInterface $flashBag,
                                AccountRepository $accountRepo,
                                AgentRepository $agentRepo,
                                AccountAgentSubscriptionRepository $subscriptionRepo,
                                UrlGeneratorInterface $urlGenerator,
                                Security $security
    )
    {
        $this->metaApiClient = $metaApiClient;
        $this->flashBag = $flashBag;
        $this->accountRepo = $accountRepo;
        $this->agentRepo = $agentRepo;
        $this->subscriptionRepo = $subscriptionRepo;
        $this->urlGenerator = $urlGenerator;
        $this->security = $security;
    }

    /**
     * @Route("/update_subscriber", name="app_metapi_update_subscriber", methods={"POST"})
     */
    public function updateSubscriber(Request $request): RedirectResponse
    {
        ## MOVED TO AgentController
        /*$subscriberId = $request->request->get('subscriberId');
        $strategyId = $request->request->get('strategyId');
        $multiplier = (float) $request->request->get('multiplier');

        if (!$subscriberId || !$strategyId || !$multiplier) {
            $this->flashBag->add('primary', 'Invalid data provided.');
            return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
        }

        $account = $this->accountRepo->findOneBy(['meta_id' => $subscriberId]);
        $agent = $this->agentRepo->findOneBy(['meta_id' => $strategyId]);
        $user = $account->getUser();

        try {
            $data = [
                'name' => $user->getId() . '-' . $account->getId() . '-' . $account->getName() . '-' . $user->getUsername(),
                'subscriptions' => [
                    [
                        'strategyId' => $strategyId,
                        'multiplier' => $multiplier
                    ]
                ]
            ];

            if ($account && $agent) {
                $this->subscriptionRepo->subscribe($account, $agent);
            }
            $this->metaApiClient->updateSubscriber($subscriberId, $data);
            $this->flashBag->add('success', 'Die Strategie wurde erfolgreich abonniert.');
        } catch (\Exception $e) {
            $this->flashBag->add('primary', 'Error updateSubscriber: ' . $e->getMessage());
        }*/

        return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
    }

    /**
     * @Route("/remove_subscriber", name="app_metapi_remove_subscriber", methods={"GET"})
     */
    public function removeSubscriber(Request $request): RedirectResponse
    {
        ## MOVED TO AgentController
        // GET-Parameter auslesen
        $subscriberId = $request->query->get('subscriberId');
        $strategyId = $request->query->get('strategyId');

        // Überprüfen, ob beide Parameter vorhanden sind
        if (!$subscriberId || !$strategyId) {
            $this->flashBag->add('primary', 'Ungültige Daten bereitgestellt.');
            return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
        }

        $account = $this->accountRepo->findOneBy(['meta_id' => $subscriberId]);

        // Überprüfen, ob der Account existiert
        if (!$account) {
            $this->flashBag->add('danger', 'Der angegebene Account wurde nicht gefunden.');
            return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
        }

        // Überprüfen, ob der Account dem aktuellen Benutzer gehört
        if ($account->getUser() !== $this->security->getUser()) {
            $this->flashBag->add('danger', 'Sie haben keine Berechtigung, diesen Account zu verwalten.');
            return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
        }

        // Account und Agent aus der Datenbank abrufen
        $account = $this->accountRepo->findOneBy(['meta_id' => $subscriberId]);
        $agent = $this->agentRepo->findOneBy(['meta_id' => $strategyId]);

        if (!$account || !$agent) {
            $this->flashBag->add('primary', 'Account oder Agent nicht gefunden.');
            return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
        }

        try {
            // Entferne die Beziehung in der Datenbank
            $this->subscriptionRepo->unsubscribe($account, $agent);

//            // Aktuelle Subscriptions abrufen und die Strategie entfernen
//            $currentSubscriptions = $this->metaApiClient->getSubscriber($subscriberId)['subscriptions'];
//            $updatedSubscriptions = array_filter($currentSubscriptions, function ($subscription) use ($strategyId) {
//                return $subscription['strategyId'] !== $strategyId; // Entfernt nur die übergebene Strategie
//            });

            // Aktualisiere den Subscriber auf der MetaApi
            $this->metaApiClient->updateSubscriber($subscriberId, [
                'name' => $account->getName(),
                'subscriptions' => []
            ]);

            $this->flashBag->add('success', 'Die Strategie wurde erfolgreich entfernt.');
        } catch (\Exception $e) {
            $this->flashBag->add('primary', 'Error removeSubscriber: ' . $e->getMessage());
        }

        return new RedirectResponse($this->urlGenerator->generate('app_agents_index'));
    }
}