<?php

namespace App\Controller;

use App\Entity\User;
use App\Form\UserType;
use App\Repository\AccountRepository;
use App\Repository\SubscriptionRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Session\Flash\FlashBagInterface;

/**
 * @Route("/user")
 */
class UserController extends AbstractController
{
    private UserPasswordHasherInterface $passwordHasher;

    private FlashBagInterface $flashBag;

    public function __construct(
        UserPasswordHasherInterface $passwordHasher,
        FlashBagInterface $flashBag
    )
    {
        $this->passwordHasher = $passwordHasher;
        $this->flashBag = $flashBag;
    }

    /**
     * @Route("/", name="app_user_index", methods={"GET"})
     */
    public function index(UserRepository $userRepository, SubscriptionRepository $subscriptionRepository): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        return $this->render('user/index.html.twig', [
            'users' => $userRepository->findAll(),
            'subscriptions' => $subscriptionRepository->findAll(),
        ]);
    }

    /**
     * @Route("/new", name="app_user_new", methods={"GET", "POST"})
     */
    public function new(Request $request, UserRepository $userRepository): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        $user = new User();
        $form = $this->createForm(UserType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $userRepository->add($user, true);

            return $this->redirectToRoute('app_user_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('user/new.html.twig', [
            'user' => $user,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/profile", name="app_user_profile", methods={"GET", "POST"})
     */
    public function profile(Request $request, UserRepository $userRepository): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        $user = $this->getUser();

        $form = $this->createForm(UserType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $userRepository->add($user, true);

            $this->flashBag->add('success', 'Die Änderungen wurden erfolgreich gespeichert.');
            return $this->redirectToRoute('app_user_profile', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('user/edit.html.twig', [
            'user' => $user,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/{id}", name="app_user_show", methods={"GET"})
     */
    public function show(User $user): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        return $this->render('user/show.html.twig', [
            'user' => $user,
        ]);
    }

    /**
     * @Route("/{id}/edit", name="app_user_edit", methods={"GET", "POST"})
     */
    public function edit(Request $request, User $user, UserRepository $userRepository): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        $form = $this->createForm(UserType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $userRepository->add($user, true);

            return $this->redirectToRoute('app_user_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('user/edit.html.twig', [
            'user' => $user,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/{id}", name="app_user_delete", methods={"POST"})
     */
    public function delete(Request $request, User $user, UserRepository $userRepository): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        if ($this->isCsrfTokenValid('delete'.$user->getId(), $request->request->get('_token'))) {
            $userRepository->remove($user, true);
        }

        return $this->redirectToRoute('app_user_index', [], Response::HTTP_SEE_OTHER);
    }

    /**
     * @Route("/{id}/reset-password", name="app_user_reset_password", methods={"GET"})
     */
    public function resetPassword(User $user, UserRepository $userRepository): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        // Generiere ein zufälliges Passwort
        $newPassword = bin2hex(random_bytes(8)); // 16 Zeichen langes zufälliges Passwort
        $hashedPassword = $this->passwordHasher->hashPassword($user, $newPassword);

        $user->setPassword($hashedPassword);
        $userRepository->add($user, true);

        // Zeige das neue Passwort als Flash-Nachricht an
        $this->addFlash('success', 'Neues Passwort für ' . $user->getFirstname() . ' ' . $user->getLastname() . ' ' . $user->getEmail() . ' : ' . $newPassword);

        // Keine Änderungen am Benutzer speichern, nur das Passwort anzeigen
        return $this->redirectToRoute('app_user_show', ['id' => $user->getId()]);
    }

    /**
     * @Route("/{id}/deactivate-user", name="app_user_deactivate", methods={"GET"})
     */
    public function deactivateUser(
        User $user,
        UserRepository $userRepository,
        AccountRepository $accountRepository,
        EntityManagerInterface $entityManager
    ): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        // Hole alle Accounts des aktuellen Benutzers
        $accounts = $accountRepository->findBy(['user' => $user->getId()]);

        foreach ($accounts as $account) {
            $account->setError("subscription expired");
            $entityManager->persist($account);
            $entityManager->flush();

            $this->addFlash('success', 'Account ' . $account->getLogin() . ' wurde deaktiviert.');
        }

        $user->setSubscriptionStatus("deactivated");
        $user->setMaxAccounts(0);
        $userRepository->add($user, true);

        $this->addFlash('success', 'User ' . $user->getFirstname() . ' ' . $user->getLastname() . ' ' . $user->getEmail() . ' wurde deaktiviert.');

        return $this->redirectToRoute('app_user_index');
    }

    /**
     * @Route("/{id}/activate-user", name="app_user_activate", methods={"GET"})
     */
    public function activateUser(
        User $user,
        UserRepository $userRepository,
        AccountRepository $accountRepository,
        EntityManagerInterface $entityManager
    ): Response
    {
        // Prüfen, ob der Benutzer ein Admin ist
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_default');
        }

        // Hole alle Accounts des aktuellen Benutzers
        $accounts = $accountRepository->findBy(['user' => $user->getId()]);

        foreach ($accounts as $account) {
            $account->setError("");
            $entityManager->persist($account);
            $entityManager->flush();

            $this->addFlash('success', 'Account ' . $account->getLogin() . ' wurde aktiviert.');
        }

        if($user->getSubscriptionStatus() == "deactivated") {
            $user->setSubscriptionStatus("");
        }
        $user->setMaxAccounts(1);
        $userRepository->add($user, true);

        $this->addFlash('success', 'User ' . $user->getFirstname() . ' ' . $user->getLastname() . ' ' . $user->getEmail() . ' wurde aktiviert.');

        return $this->redirectToRoute('app_user_index');
    }
}
