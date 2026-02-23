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
 * @Route("/signal")
 */
class SignalController extends AbstractController
{
    /**
     * @Route("/", name="app_signal_index", methods={"GET"})
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

        return $this->render('signal/index.html.twig', [
            'signals' => $signals,
        ]);
    }

    /**
     * @Route("/new", name="app_signal_new", methods={"GET", "POST"})
     */
    public function new(Request $request, SignalRepository $signalRepository): Response
    {
        $signal = new Signal();
        $form = $this->createForm(SignalType::class, $signal);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $signalRepository->add($signal, true);

            return $this->redirectToRoute('app_signal_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('signal/new.html.twig', [
            'signal' => $signal,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/{id}", name="app_signal_show", methods={"GET"})
     */
    public function show(Signal $signal): Response
    {
        return $this->render('signal/show.html.twig', [
            'signal' => $signal,
        ]);
    }

    /**
     * @Route("/{id}/edit", name="app_signal_edit", methods={"GET", "POST"})
     */
    public function edit(Request $request, Signal $signal, SignalRepository $signalRepository): Response
    {
        $form = $this->createForm(SignalType::class, $signal);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $signalRepository->add($signal, true);

            return $this->redirectToRoute('app_signal_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('signal/edit.html.twig', [
            'signal' => $signal,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/{id}", name="app_signal_delete", methods={"POST"})
     */
    public function delete(Request $request, Signal $signal, SignalRepository $signalRepository): Response
    {
        if ($this->isCsrfTokenValid('delete'.$signal->getId(), $request->request->get('_token'))) {
            $signalRepository->remove($signal, true);
        }

        return $this->redirectToRoute('app_signal_index', [], Response::HTTP_SEE_OTHER);
    }
}
