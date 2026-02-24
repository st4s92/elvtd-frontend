<?php

namespace App\Controller;

use App\HelpdeskBundle\Entity\Ticket;
use App\HelpdeskBundle\Entity\Comment;
use App\HelpdeskBundle\Repository\TicketRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\HttpFoundation\RequestStack;

class TicketApiController extends AbstractController
{
    private const API_KEY = 'elvtd-tickets-2026-sk9Xm4pQzR';

    private $requestStack;

    public function __construct(RequestStack $requestStack)
    {
        $this->requestStack = $requestStack;
    }

    private function validateApiKey(Request $request): ?Response
    {
        $apiKey = $request->query->get('api_key');
        if ($apiKey !== self::API_KEY) {
            $response = new JsonResponse(['success' => false, 'message' => 'Invalid or missing API key.'], 403);
            $response->setEncodingOptions(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return $response;
        }
        return null;
    }

    /**
     * @Route("/api/tickets/closed", name="api_tickets_closed", methods={"GET"})
     */
    public function apiClosedTickets(Request $request, TicketRepository $ticketRepository): Response
    {
        if ($error = $this->validateApiKey($request)) {
            return $error;
        }

        $tickets = $ticketRepository->findBy(['status' => 'closed']);
        return $this->formatTicketsJson($tickets);
    }

    /**
     * @Route("/api/tickets/open", name="api_tickets_open", methods={"GET"})
     */
    public function apiOpenTickets(Request $request, TicketRepository $ticketRepository): Response
    {
        if ($error = $this->validateApiKey($request)) {
            return $error;
        }

        $tickets = $ticketRepository->findBy(['status' => ['open', 'in_progress']]);
        return $this->formatTicketsJson($tickets);
    }

    /**
     * @Route("/api/tickets/{id}/reply", name="api_tickets_reply", methods={"POST"})
     */
    public function apiReplyTicket(Request $request, Ticket $ticket, EntityManagerInterface $entityManager, MailerInterface $mailer): Response
    {
        if ($error = $this->validateApiKey($request)) {
            return $error;
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? $request->request->get('content');

        if (!$content) {
            $response = new JsonResponse(['success' => false, 'message' => 'Content is required.'], 400);
            $response->setEncodingOptions(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return $response;
        }

        // Support both JSON and Form Data for sendTicketEmail which reads from request->request
        if ($data && isset($data['content'])) {
            $request->request->set('content', $content);
        }

        $comment = new Comment();
        $comment->setContent($content);
        $stas = $entityManager->getRepository(\App\Entity\User::class)->findOneBy(['username' => 'stas']);
        $comment->setUser($stas);
        $comment->setTicket($ticket);
        $entityManager->persist($comment);
        $entityManager->flush();

        $ticket->setStatus('in_progress');
        $entityManager->persist($ticket);

        // Send email to admin and user
        $this->sendTicketEmail($mailer, $ticket, 'comment_added');

        $response = new JsonResponse(['success' => true, 'message' => 'Reply added successfully!']);
        $response->setEncodingOptions(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $response;
    }

    private function formatTicketsJson(array $tickets): Response
    {
        $data = [];
        foreach ($tickets as $ticket) {
            $comments = [];
            foreach ($ticket->getComments() as $comment) {
                $comments[] = [
                    'id' => $comment->getId(),
                    'content' => $comment->getContent(),
                    'user' => $comment->getUser() ? $comment->getUser()->getUsername() : null,
                    'createdAt' => $comment->getCreatedAt() ? $comment->getCreatedAt()->format('Y-m-d H:i:s') : null,
                ];
            }

            $data[] = [
                'id' => $ticket->getId(),
                'title' => $ticket->getTitle(),
                'description' => $ticket->getDescription(),
                'status' => $ticket->getStatus(),
                'user' => $ticket->getUser() ? $ticket->getUser()->getUsername() : null,
                'createdAt' => $ticket->getCreatedAt() ? $ticket->getCreatedAt()->format('Y-m-d H:i:s') : null,
                'comments' => $comments,
            ];
        }

        $response = new JsonResponse($data);
        $response->setEncodingOptions(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $response;
    }

    private function sendTicketEmail(MailerInterface $mailer, Ticket $ticket, string $action, ?string $oldState = null): void
    {
        $user = $ticket->getUser();
        $adminEmail = 'support@elvtdfinance.com';
        $currentRequest = $this->requestStack->getCurrentRequest();
        $commenterUsername = $this->getUser() ? $this->getUser()->getUsername() : 'Stas';
        $commentContent = $currentRequest ? $currentRequest->request->get('content') : '';

        $template = match ($action) {
            'created' => 'HelpdeskBundle/emails/ticket_created.html.twig',
            'updated' => 'HelpdeskBundle/emails/ticket_updated.html.twig',
            'comment_added' => 'HelpdeskBundle/emails/ticket_comment_added.html.twig',
            default => 'HelpdeskBundle/emails/ticket_created.html.twig',
        };

        $context = [
            'user' => $user,
            'ticket' => $ticket,
            'oldState' => $oldState,
            'commenterUsername' => $commenterUsername,
            'commentContent' => $commentContent,
        ];

        $email = (new Email())
            ->from('support@elvtdfinance.com')
            ->to($user->getEmail())
            ->cc($adminEmail)
            ->subject($this->renderView('HelpdeskBundle/emails/subject_' . $action . '.txt.twig', $context))
            ->html($this->renderView($template, $context));

        $mailer->send($email);
    }
}
