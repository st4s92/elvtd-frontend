<?php

namespace App\Controller;

use App\Entity\TradeLog;
use App\Form\TradeLogType;
use App\Repository\TradeLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/trade/log")
 */
class TradeLogController extends AbstractController
{
    /**
     * @Route("/", name="app_trade_log_index", methods={"GET"})
     */
    public function index(TradeLogRepository $tradeLogRepository): Response
    {
        return $this->render('trade_log/index.html.twig', [
            'trade_logs' => $tradeLogRepository->findAll(),
        ]);
    }

    /**
     * @Route("/new", name="app_trade_log_new", methods={"GET", "POST"})
     */
    public function new(Request $request, TradeLogRepository $tradeLogRepository): Response
    {
        $tradeLog = new TradeLog();
        $form = $this->createForm(TradeLogType::class, $tradeLog);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $tradeLogRepository->add($tradeLog, true);

            return $this->redirectToRoute('app_trade_log_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('trade_log/new.html.twig', [
            'trade_log' => $tradeLog,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/{id}", name="app_trade_log_show", methods={"GET"})
     */
    public function show(TradeLog $tradeLog): Response
    {
        return $this->render('trade_log/show.html.twig', [
            'trade_log' => $tradeLog,
        ]);
    }

    /**
     * @Route("/{id}/edit", name="app_trade_log_edit", methods={"GET", "POST"})
     */
    public function edit(Request $request, TradeLog $tradeLog, TradeLogRepository $tradeLogRepository): Response
    {
        $form = $this->createForm(TradeLogType::class, $tradeLog);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $tradeLogRepository->add($tradeLog, true);

            return $this->redirectToRoute('app_trade_log_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->renderForm('trade_log/edit.html.twig', [
            'trade_log' => $tradeLog,
            'form' => $form,
        ]);
    }

    /**
     * @Route("/{id}", name="app_trade_log_delete", methods={"POST"})
     */
    public function delete(Request $request, TradeLog $tradeLog, TradeLogRepository $tradeLogRepository): Response
    {
        if ($this->isCsrfTokenValid('delete'.$tradeLog->getId(), $request->request->get('_token'))) {
            $tradeLogRepository->remove($tradeLog, true);
        }

        return $this->redirectToRoute('app_trade_log_index', [], Response::HTTP_SEE_OTHER);
    }
}
