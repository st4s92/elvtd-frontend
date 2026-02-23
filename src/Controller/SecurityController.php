<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;

class SecurityController extends AbstractController
{
    /**
     * @Route("/forgot-password", name="app_forgot_password")
     */
    public function forgotPassword(Request $request, UserRepository $userRepository, MailerInterface $mailer): Response
    {
        if ($request->isMethod('POST')) {
            $email = $request->request->get('email');

            $user = $userRepository->findOneBy(['email' => $email]);

            if (!$user) {
                $this->addFlash('danger', 'No account found with that email address.');
                return $this->redirectToRoute('app_forgot_password');
            }

            // Sende die Bestätigungs-E-Mail
            $confirmationToken = bin2hex(random_bytes(16)); // Einfacher Token für die Bestätigung
            $user->setResetToken($confirmationToken); // Speichere den Token temporär
            $entityManager = $this->getDoctrine()->getManager();
            $entityManager->persist($user);
            $entityManager->flush();

            $email = (new TemplatedEmail())
                ->from('"ELVTD Finance" <support@elvtdfinance.com>')
                ->to($user->getEmail())
                ->subject('Passwort zurücksetzen')
                ->htmlTemplate('emails/confirm_reset.html.twig')
                ->context([
                    'username' => $user->getUsername(),
                    'confirmationToken' => $confirmationToken,
                ]);

            $mailer->send($email);

            $this->addFlash('success', 'Eine Bestätigungs-E-Mail wurde gesendet. Bitte überprüfen Sie Ihren Posteingang.');
            return $this->redirectToRoute('app_login');
        }

        return $this->render('security/forgot_password.html.twig');
    }

    /**
     * @Route("/confirm-reset/{token}", name="app_confirm_reset")
     */
    public function confirmReset(string $token, UserRepository $userRepository, UserPasswordHasherInterface $passwordHasher, EntityManagerInterface $entityManager, MailerInterface $mailer): Response
    {
        $user = $userRepository->findOneBy(['resetToken' => $token]);

        if (!$user) {
            $this->addFlash('danger', 'Invalid confirmation token.');
            return $this->redirectToRoute('app_forgot_password');
        }

        // Generiere ein neues Passwort
        $newPassword = bin2hex(random_bytes(8)); // 8-stelliges Hex-Passwort
        $hashedPassword = $passwordHasher->hashPassword($user, $newPassword);
        $user->setPassword($hashedPassword);
        $user->setResetToken(null); // Token nach Verwendung löschen

        $entityManager->persist($user);
        $entityManager->flush();

        // Sende die E-Mail mit dem neuen Passwort
        $email = (new TemplatedEmail())
            ->from('"ELVTD Finance" <support@elvtdfinance.com>')
            ->to($user->getEmail())
            ->subject('Ihr neues Passwort')
            ->htmlTemplate('emails/new_password.html.twig')
            ->context([
                'username' => $user->getUsername(),
                'newPassword' => $newPassword,
            ]);

        $mailer->send($email);

        $this->addFlash('success', 'Ein neues Passwort wurde generiert und an Ihre E-Mail-Adresse gesendet. Sie können sich jetzt anmelden.');
        return $this->redirectToRoute('app_login');
    }
}