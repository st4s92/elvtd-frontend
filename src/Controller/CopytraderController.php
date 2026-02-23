<?php

namespace App\Controller;

use App\Entity\Signal;
use App\Form\SignalType;
use App\Repository\SignalRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/copytrader")
 */
class CopytraderController extends AbstractController
{
    /**
     * @Route("/", name="app_copytrader_index", methods={"GET"})
     */
    public function index(SignalRepository $signalRepository): Response
    {
        $user = $this->getUser();

        // Wenn der Benutzer nicht eingeloggt ist, leite ihn auf die Login-Seite weiter
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        // Hole die Signale des eingeloggten Benutzers
        $signals = $signalRepository->findBy(['user' => $user]);

        return $this->render('copytrader/index.html.twig', [
            'signals' => $signals,
        ]);
    }
}
