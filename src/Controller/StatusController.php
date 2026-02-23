<?php

namespace App\Controller;

use App\Entity\Subscription;
use App\Entity\User;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Routing\Annotation\Route;

class SubscriptionController extends AbstractController
{
    /**
     * @Route("/trial", name="app_trial")
     */
    public function trialPage(): Response
    {
        return $this->render('subscription/trial.html.twig');
    }

    /**
     * @Route("/trial/start", name="app_trial_start")
     */
    public function startTrial(EntityManagerInterface $entityManager, SubscriptionRepository $subscriptionRepository): Response
    {
        $user = $this->getUser();

        // Prüfen, ob der User bereits eine aktive Subscription hat
        $existingSubscription = $subscriptionRepository->findOneBy(['user' => $user, 'status' => 'trialing']);
        if ($existingSubscription) {
            $this->addFlash('info', 'Du hast bereits eine laufende Testphase.');
            return $this->redirectToRoute('app_default');
        }

        // Setze max_accounts auf 1
        $user->setMaxAccounts(1);
        $user->setSubscriptionStatus('trialing');

        // Neue Subscription erstellen
        $subscription = new Subscription();
        $subscription->setUser($user);
        $subscription->setStripeSubscriptionId(null);
        $subscription->setStatus('trialing');
        $subscription->setCurrentPeriodStart(new \DateTime());
        $subscription->setCurrentPeriodEnd((new \DateTime())->modify('+14 days'));
        $subscription->setTrialEnd((new \DateTime())->modify('+14 days'));
        $subscription->setCreatedAt(new \DateTime());

        $entityManager->persist($subscription);
        $entityManager->persist($user);
        $entityManager->flush();

        $this->addFlash('success', 'Deine 14-tägige Testphase wurde gestartet!');

        return $this->redirectToRoute('app_default');
    }

    /**
     * @Route("/subscription/api/start", name="app_subscription_api_start", methods={"POST"})
     */
    public function subscriptionApiStart(
        Request $request,
        EntityManagerInterface $entityManager,
        SubscriptionRepository $subscriptionRepository,
        LoggerInterface $logger,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        MailerInterface $mailer
    ): Response {

        $subscriptionData = json_decode($request->getContent(), true);

        if (!isset($subscriptionData['key']) || $subscriptionData['key'] != 'fsmib567865ovzKFJHEJKs89gs9gr8zgsrFLKJHWubhsb9sphvssb7b') {
            $logger->error('Ungültige Email im "data"-Feld: ' . json_encode($subscriptionData));
            return new JsonResponse(['error' => 'Authorization failed.'], 403);
        }

        if (!isset($subscriptionData['email'])) {
            $logger->error('Ungültige Email im "data"-Feld: ' . json_encode($subscriptionData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur im "data"-Feld'], 400);
        }

        if (!isset($subscriptionData['product'])) {
            $logger->error('Ungültige Daten (product) im "data"-Feld: ' . json_encode($subscriptionData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur (product) im "data"-Feld'], 400);
        }

        $logger->info('subscriptionData erfolgreich empfangen: ' . json_encode($subscriptionData));

        $user = $userRepository->findOneBy(['email' => $subscriptionData['email']]);

        if (!$user) {
            // Neuer Benutzer anlegen
            $user = new User();
            $user->setEmail($subscriptionData['email']);
            $user->setUsername($subscriptionData['email']); // Standardmäßig den E-Mail als Benutzernamen
            $user->setFirstname(!empty($subscriptionData['firstname']) ? $subscriptionData['firstname'] : $subscriptionData['email']);            $user->setLastname($subscriptionData['lastname']);
            $user->setLastname(!empty($subscriptionData['lastname']) ? $subscriptionData['lastname'] : $subscriptionData['email']);            $user->setLastname($subscriptionData['lastname']);
            $plainPassword = bin2hex(random_bytes(8)); // Generiere ein zufälliges 8-stelliges Passwort
            $hashedPassword = $passwordHasher->hashPassword($user, $plainPassword);
            $user->setPassword($hashedPassword);
            $user->setRoles(['ROLE_USER']);
            $user->setLastLogin(new \DateTime('now', new \DateTimeZone('Asia/Bangkok')));
            $user->setMaxAccounts(1);
            $user->setSubscriptionStatus($subscriptionData['product']);

            $entityManager->persist($user);
            $entityManager->flush();

            $entityManager->persist($user);
            $entityManager->flush();

            // E-Mail an den neuen Benutzer senden
            $email = (new TemplatedEmail())
                ->from('"ELVTD Finance" <support@elvtdfinance.com>')
                ->to($user->getEmail())
                ->subject('Willkommen bei ELVTD Finance - Ihre Login Daten')
                ->htmlTemplate('emails/registration.html.twig')
                ->context([
                    'username' => $user->getUsername(),
                    'plainPassword' => $plainPassword,
                ]);

            try {
                $mailer->send($email);
                $logger->info('Willkommens-E-Mail an ' . $user->getEmail() . ' gesendet.');
            } catch (\Exception $e) {
                $logger->error('Fehler beim Senden der Willkommens-E-Mail: ' . $e->getMessage());
            }
        }

        // Prüfen, ob der User bereits eine aktive Subscription hat
        $existingSubscription = $subscriptionRepository->findOneBy(['user' => $user]);
        if ($existingSubscription) {
            // Bestehende Subscription löschen
            try {
                $entityManager->remove($existingSubscription);
                $entityManager->flush();
                $logger->info('Bestehende Subscription für User ' . $user->getEmail() . ' wurde gelöscht.');
            } catch (\Exception $e) {
                $logger->error('Fehler beim Löschen der bestehenden Subscription: ' . $e->getMessage());
                return new JsonResponse(['error' => 'Fehler beim Löschen der bestehenden Subscription'], 500);
            }
        }

        $status = '1month';
        $time = '+30 days';

        if($subscriptionData['product'] == "1month") {
            $status = '1month';
            $time = '+30 days';
        }
        elseif($subscriptionData['product'] == "2month") {
            $status = '2month';
            $time = '+60 days';
        }
        elseif($subscriptionData['product'] == "6month") {
            $status = '6month';
            $time = '+183 days';
        }
        elseif($subscriptionData['product'] == "12month") {
            $status = '12month';
            $time = '+365 days';
        }
        elseif($subscriptionData['product'] == "12month_onetime") {
            $status = '12month_onetime';
            $time = '+365 days';
        }

        // Setze max_accounts auf 1
        $user->setMaxAccounts(1);
        $user->setSubscriptionStatus($subscriptionData['product']);

        // Neue Subscription erstellen
        $subscription = new Subscription();
        $subscription->setUser($user);
        $subscription->setStripeSubscriptionId(null);
        $subscription->setStatus($status);
        $subscription->setCurrentPeriodStart(new \DateTime());
        $subscription->setCurrentPeriodEnd((new \DateTime())->modify($time));
        #$subscription->setTrialEnd((new \DateTime())->modify('+183 days'));
        $subscription->setCreatedAt(new \DateTime());

        // Signal speichern
        try {
            $entityManager->persist($subscription);
            $entityManager->persist($user);
            $entityManager->flush();

            $logger->info('Subscription erfolgreich gespeichert: ' . json_encode($subscriptionData));
        } catch (\Exception $e) {
            $logger->error('Fehler beim Speichern der Subscription: ' . $e->getMessage());
            return new JsonResponse(['error' => 'Fehler beim Speichern der Subscription'], 500);
        }

        return new JsonResponse(['success' => true, 'subscription' => $subscriptionData], 201);
    }

    /**
     * @Route("/subscription/api/manual", name="app_subscription_api_manual", methods={"POST"})
     */
    public function subscriptionApiManual(Request $request, EntityManagerInterface $entityManager, SubscriptionRepository $subscriptionRepository, LoggerInterface $logger) : Response
    {
        $subscriptionData['email'] = $request->request->get('email');
        $subscriptionData['product'] = $request->request->get('product');

        // Prüfe die Struktur des extrahierten JSON
        if (!isset($subscriptionData['email'])) {
            $logger->error('Ungültige Email im "data"-Feld: ' . json_encode($subscriptionData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur im "data"-Feld'], 400);
        }

        // Prüfe die Struktur des extrahierten JSON
        if (!isset($subscriptionData['product'])) {
            $logger->error('Ungültige Daten (product) im "data"-Feld: ' . json_encode($subscriptionData));
            return new JsonResponse(['error' => 'Ungültige Datenstruktur (product) im "data"-Feld' . json_encode($subscriptionData) ], 400);
        }

        $logger->info('subscriptionData erfolgreich empfangen: ' . json_encode($subscriptionData));

        // Hole den Account anhand der license (meta_id)
        $user = $entityManager->getRepository(\App\Entity\User::class)->findOneBy(['email' => $subscriptionData['email']]);

        if (!$user) {
            $logger->error('Kein Benutzer gefunden mit Email: ' . $subscriptionData['email']);
            return new JsonResponse(['error' => 'User not found'], 404);
        }

        // Prüfen, ob der User bereits eine aktive Subscription hat
        $existingSubscription = $subscriptionRepository->findOneBy(['user' => $user]);
        if ($existingSubscription) {
            // Bestehende Subscription löschen
            try {
                $entityManager->remove($existingSubscription);
                $entityManager->flush();
                $logger->info('Bestehende Subscription für User ' . $user->getEmail() . ' wurde gelöscht.');
            } catch (\Exception $e) {
                $logger->error('Fehler beim Löschen der bestehenden Subscription: ' . $e->getMessage());
                return new JsonResponse(['error' => 'Fehler beim Löschen der bestehenden Subscription'], 500);
            }
        }

        $status = '3month';
        $time = '+90 days';

        if($subscriptionData['product'] == "2month") {
            $status = '2month';
            $time = '+60 days';
        }
        else if($subscriptionData['product'] == "6month") {
            $status = '6month';
            $time = '+183 days';
        }
        elseif($subscriptionData['product'] == "12month") {
            $status = '12month';
            $time = '+365 days';
        }
        elseif($subscriptionData['product'] == "12month_onetime") {
            $status = '12month_onetime';
            $time = '+365 days';
        }

        // Setze max_accounts auf 1
        $user->setMaxAccounts(1);
        $user->setSubscriptionStatus($subscriptionData['product']);

        // Neue Subscription erstellen
        $subscription = new Subscription();
        $subscription->setUser($user);
        $subscription->setStripeSubscriptionId(null);
        $subscription->setStatus($status);
        $subscription->setCurrentPeriodStart(new \DateTime());
        $subscription->setCurrentPeriodEnd((new \DateTime())->modify($time));
        #$subscription->setTrialEnd((new \DateTime())->modify('+183 days'));
        $subscription->setCreatedAt(new \DateTime());

        // Signal speichern
        try {
            $entityManager->persist($subscription);
            $entityManager->persist($user);
            $entityManager->flush();

            $logger->info('Subscription erfolgreich gespeichert: ' . json_encode($subscriptionData));
        } catch (\Exception $e) {
            $logger->error('Fehler beim Speichern der Subscription: ' . $e->getMessage());
            return new JsonResponse(['error' => 'Fehler beim Speichern der Subscription'], 500);
        }

        $this->addFlash('success', 'Deine ' . $subscriptionData['product'] . ' für ' . $subscriptionData['email'] . ' wurde aktiviert!');

        return $this->redirectToRoute('app_user_index');
    }

    /**
     * @Route("/elvtd/start", name="app_elvtd_start")
     */
    public function elvtdTrial(EntityManagerInterface $entityManager, SubscriptionRepository $subscriptionRepository): Response
    {
        $user = $this->getUser();

        // Prüfen, ob der User bereits eine aktive Subscription hat
        $existingSubscription = $subscriptionRepository->findOneBy(['user' => $user, 'status' => 'trialing']);
        if ($existingSubscription) {
            $this->addFlash('info', 'Du hast bereits eine laufende Testphase.');
            return $this->redirectToRoute('app_default');
        }

        // Setze max_accounts auf 1
        $user->setMaxAccounts(1);
        $user->setSubscriptionStatus('elvtd');

        // Neue Subscription erstellen
        $subscription = new Subscription();
        $subscription->setUser($user);
        $subscription->setStripeSubscriptionId(null);
        $subscription->setStatus('elvtd');
        $subscription->setCurrentPeriodStart(new \DateTime());
        $subscription->setCurrentPeriodEnd((new \DateTime())->modify('+90 days'));
        $subscription->setTrialEnd((new \DateTime())->modify('+90 days'));
        $subscription->setCreatedAt(new \DateTime());

        $entityManager->persist($subscription);
        $entityManager->persist($user);
        $entityManager->flush();

        $this->addFlash('success', 'Deine ELVTD Testphase wurde aktiviert!');

        return $this->redirectToRoute('app_default');
    }
}