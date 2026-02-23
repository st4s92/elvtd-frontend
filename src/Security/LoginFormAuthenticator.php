<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouterInterface as RoutingRouterInterface;  // Alias hinzufügen
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Guard\Authenticator\AbstractFormLoginAuthenticator;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Routing\RouterInterface; // Standard RouterInterface
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Session\SessionInterface; // Richtiges SessionInterface importieren

class LoginFormAuthenticator extends AbstractFormLoginAuthenticator
{
    private $httpClient;
    private $router;
    private SessionInterface $session;

    public function __construct(HttpClientInterface $httpClient, RoutingRouterInterface $router, SessionInterface $session) // Alias verwenden
    {
        $this->httpClient = $httpClient;
        $this->router = $router;
        $this->session = $session;
    }

    /**
     * Diese Methode überprüft das reCAPTCHA-Token vor der Authentifizierung.
     */
    public function validateRecaptcha(string $token): bool
    {
        // Holen des Secret Keys aus der .env-Datei
        $secretKey = $_SERVER['GOOGLE_RECAPTCHA_SECRET'] ?? null;

        // Überprüfen, ob der Secret Key geladen wurde
        if (!$secretKey) {
            $this->session->getFlashBag()->add('danger', 'reCAPTCHA-Validierung fehlgeschlagen.');
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

        return $data['success'] && $data['score'] >= 0.5;
    }

    /**
     * Holt die Anmeldedaten und überprüft das reCAPTCHA-Token.
     */
    public function getCredentials(Request $request)
    {
        if ($request->getPathInfo() != '/login' || !$request->isMethod('POST')) {
            return null;
        }

        // Hole das reCAPTCHA-Token und überprüfe es
        $recaptchaToken = $request->request->get('login_form')['recaptcha'];

        if (!$recaptchaToken) {
            $this->session->getFlashBag()->add('danger', 'reCAPTCHA-Validierung fehlgeschlagen.');
            return [
                '_username' => '',
                '_password' => '',
            ];
        }

       /* if(!$this->validateRecaptcha($recaptchaToken)) {
            $this->session->getFlashBag()->add('danger', 'reCAPTCHA-Validierung fehlgeschlagen.');
            return [
                '_username' => '',
                '_password' => '',
            ];
        }*/

        // Rückgabe der Credentials
        return [
            '_username' => $request->request->get('_username'),
            '_password' => $request->request->get('_password'),
        ];
    }

    /**
     * Holt den Benutzer mit den Anmeldedaten.
     */
    public function getUser($credentials, UserProviderInterface $userProvider)
    {
        return $userProvider->loadUserByUsername($credentials['_username']);
    }

    public function checkCredentials($credentials, UserInterface $user)
    {
        if(!password_verify($credentials['_password'], $user->getPassword())) {
            $this->session->getFlashBag()->add('danger', 'Login-Validierung fehlgeschlagen. Username nicht vorhanden oder Passwort fehlgeschlagen.');
            return false;
        }
        else
            return true;
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, $providerKey)
    {
        return new RedirectResponse($this->router->generate('app_default'));
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception)
    {
        return new RedirectResponse($this->router->generate('app_login'));
    }

    public function supports(Request $request)
    {
        return $request->getPathInfo() == '/login' && $request->isMethod('POST');
    }

    public function getLoginUrl()
    {
        return $this->router->generate('app_login');
    }
}