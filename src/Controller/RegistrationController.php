<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Form\RegistrationType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;

class RegistrationController extends AbstractController
{
    private $httpClient;

    // Injectiere den HttpClientInterface in den Konstruktor
    public function __construct(HttpClientInterface $httpClient)
    {
        $this->httpClient = $httpClient;
    }

    /**
     * @Route("/register", name="app_register", methods={"GET", "POST"})
     */
    public function register(Request $request,
                             UserRepository $userRepository,
                             UserPasswordHasherInterface $passwordHasher,
                             MailerInterface $mailer
    ): Response
    {
        # return $this->redirectToRoute('app_login');

        $user = new User();
        $form = $this->createForm(RegistrationType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {

//            // Hole das reCAPTCHA-Token aus dem Formular
//            $recaptchaToken = $form->get('recaptcha')->getData();
//
//            // Überprüfe das reCAPTCHA-Token
//            if (!$this->validateRecaptcha($recaptchaToken)) {
//                // Wenn die Validierung fehlschlägt, gib eine Flash-Nachricht aus und leite zurück zur Registrierungsseite
//                $this->addFlash('danger', 'reCAPTCHA-Validierung fehlgeschlagen.');
//                return $this->redirectToRoute('app_register');
//            }

            // Passwort hashen
            $hashedPassword = $passwordHasher->hashPassword(
                $user,
                $form->get('password')->getData()
            );
            $user->setPassword($hashedPassword);

            #$user->setAffiliateCode($form->get('affiliatecode')->getData());

            // Rolle setzen
            $user->setRoles(['ROLE_USER']);
            $user->setLastLogin(new \DateTime());

            // Benutzer speichern
            $userRepository->add($user, true);

            // E-Mail senden
            $email = (new TemplatedEmail())
                ->from('"ELVTD Finance" <support@elvtdfinance.com>')
                ->to($user->getEmail())
                ->subject('Willkommen bei ELVTD Finance - Ihre Login Daten')
                ->htmlTemplate('emails/registration.html.twig')
                ->context([
                    'username' => $user->getUsername(),
                    'plainPassword' => $plainPassword,
                ]);

            $mailer->send($email);

            // Erfolgsnachricht
            $this->addFlash('success', 'Registrierung erfolgreich! Du kannst dich jetzt anmelden.');

            // Weiterleitung zum Login
            return $this->redirectToRoute('app_login');
        }

        return $this->render('registration/register.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    public function validateRecaptcha(string $token): bool
    {
        // Holen des Secret Keys aus der .env-Datei
        $secretKey = $_SERVER['GOOGLE_RECAPTCHA_SECRET'] ?? null; // $_ENV statt $_SERVER verwenden

        // Überprüfen, ob der Secret Key geladen wurde
        if (!$secretKey) {
            $this->addFlash('danger', 'reCAPTCHA-Validierung fehlgeschlagen. Secret Key nicht gesetzt.');
            return false;
        }

        // Anfrage an die Google reCAPTCHA-API
        $response = $this->httpClient->request('POST', 'https://www.google.com/recaptcha/api/siteverify', [
            'body' => [
                'secret' => $secretKey,
                'response' => $token,
            ],
        ]);

        $data = $response->toArray();

        // Fehlermeldung bei ReCaptcha-Verifizierung
        if (!$data['success']) {
            $this->addFlash('danger', 'reCAPTCHA-Validierung fehlgeschlagen. Fehler: ' . implode(', ', $data['error-codes']));
            return false;
        }

        return true;
    }
}