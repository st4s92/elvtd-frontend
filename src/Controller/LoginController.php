<?php

namespace App\Controller;

use App\Form\LoginFormType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

class LoginController extends AbstractController
{
    /**
     * @Route("/login", name="app_login")
     */
    public function login(AuthenticationUtils $authenticationUtils, Request $request): Response
    {
        // Hole den letzten Benutzernamen oder setze einen leeren String, falls null zurückkommt
        $lastUsername = $authenticationUtils->getLastUsername() ?? '';

        // Erstelle das Formular und übergebe einen leeren String, falls kein Username vorhanden ist
        $form = $this->createForm(LoginFormType::class, [
            '_username' => (string) $lastUsername, // Sicherstellen, dass ein String übergeben wird
        ]);

        // Hole den letzten Fehler
        $error = $authenticationUtils->getLastAuthenticationError();

        return $this->render('login/index.html.twig', [
            'form' => $form->createView(),
            'error' => $error,
            'last_username' => $lastUsername,
        ]);
    }

    /**
     * @Route("/logout", name="app_logout", methods={"GET"})
     */
    public function logout()
    {
        // Symfony behandelt das Logout automatisch
    }
}