<?php

namespace App\HelpdeskBundle\Controller;

use App\HelpdeskBundle\Entity\Category;
use App\HelpdeskBundle\Entity\FaqPost;
use App\HelpdeskBundle\Entity\Ticket;
use App\HelpdeskBundle\Entity\Comment;
use App\HelpdeskBundle\Form\CategoryType;
use App\HelpdeskBundle\Form\FaqPostType;
use App\HelpdeskBundle\Form\TicketType;
use App\HelpdeskBundle\Repository\CategoryRepository;
use App\HelpdeskBundle\Repository\FaqPostRepository;
use App\HelpdeskBundle\Repository\TicketRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\HttpFoundation\RequestStack; // Hinzugefügt

class TicketController extends AbstractController
{
    private $requestStack;

    public function __construct(RequestStack $requestStack)
    {
        $this->requestStack = $requestStack;
    }

    /**
     * @Route("/faq", name="app_helpdesk_faq", methods={"GET"})
     */
    public function faq(CategoryRepository $categoryRepository, TicketRepository $ticketRepository): Response
    {
        $categories = $categoryRepository->findAll();
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        $tickets = $ticketRepository->findByUser($user);

        return $this->render('HelpdeskBundle/helpdesk/faq.html.twig', [
            'categories' => $categories,
            'tickets' => $tickets,
        ]);
    }

    /**
     * @Route("/admin_helpdesk", name="app_admin_helpdesk_index", methods={"GET"})
     */
    public function admin_helpdesk(TicketRepository $ticketRepository): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        //  $tickets = $ticketRepository->findAll();
        $tickets = $ticketRepository->findAllWithLatestComment();

        return $this->render('HelpdeskBundle/helpdesk/index.html.twig', [
            'tickets' => $tickets,
        ]);
    }

    /**
     * @Route("/", name="app_helpdesk_index", methods={"GET"})
     */
    public function index(TicketRepository $ticketRepository): Response
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }
        $tickets = $ticketRepository->findByUser($user);

        return $this->render('HelpdeskBundle/helpdesk/index.html.twig', [
            'tickets' => $tickets,
        ]);
    }

    /**
     * @Route("/new", name="app_helpdesk_new", methods={"GET", "POST"})
     */
    public function new(Request $request, EntityManagerInterface $entityManager, MailerInterface $mailer): Response
    {
        $ticket = new Ticket();
        if ($this->getUser()) {
            $ticket->setUser($this->getUser());
        } else {
            return $this->json(['success' => false, 'message' => 'User not authenticated.'], 403);
        }
        $form = $this->createForm(TicketType::class, $ticket);

        if ($request->isXmlHttpRequest()) {
            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $entityManager->persist($ticket);
                $entityManager->flush();

                // Send email to admin and user
                $this->sendTicketEmail($mailer, $ticket, 'created');

                return $this->json(['success' => true, 'message' => 'Ticket created successfully!']);
            } else {
                $errors = $form->getErrors(true);
                $errorMessages = [];
                foreach ($errors as $error) {
                    $errorMessages[] = $error->getMessage();
                }
                return $this->json(['success' => false, 'message' => 'Invalid form data: ' . implode(', ', $errorMessages)], 400);
            }
            return $this->json(['success' => false, 'message' => 'Invalid request.'], 400);
        }

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($ticket);
            $entityManager->flush();

            // Send email to admin and user
            $this->sendTicketEmail($mailer, $ticket, 'created');

            $this->addFlash('success', 'Ticket created successfully!');

            return $this->redirectToRoute('app_helpdesk_index');
        }

        return $this->render('HelpdeskBundle/helpdesk/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    /**
     * @Route("/{id}/change-state", name="app_helpdesk_change_state", methods={"POST"})
     */
    public function changeState(Request $request, Ticket $ticket, EntityManagerInterface $entityManager, MailerInterface $mailer): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        $newState = $request->request->get('state');
        if (in_array($newState, ['open', 'in_progress', 'closed'])) {
            $oldState = $ticket->getStatus();
            $ticket->setStatus($newState);
            $entityManager->flush();

            // Send email to admin and user
            $this->sendTicketEmail($mailer, $ticket, 'updated', $oldState);

            $this->addFlash('success', 'Ticket state changed to ' . $newState . ' successfully!');
        } else {
            $this->addFlash('error', 'Invalid state provided.');
        }

        $referer = $request->headers->get('referer');
        if ($referer && str_contains($referer, $this->generateUrl('app_helpdesk_show', ['id' => $ticket->getId()]))) {
            return $this->redirectToRoute('app_helpdesk_show', ['id' => $ticket->getId()]);
        }

        return $this->redirectToRoute('app_admin_helpdesk_index');
    }

    /**
     * @Route("/{id}/delete", name="app_helpdesk_delete", methods={"POST"})
     */
    public function delete(Ticket $ticket, EntityManagerInterface $entityManager): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        $entityManager->remove($ticket);
        $entityManager->flush();

        $this->addFlash('success', 'Ticket deleted successfully!');

        return $this->redirectToRoute('app_admin_helpdesk_index');
    }

    /**
     * @Route("/{id}", name="app_helpdesk_show", methods={"GET"})
     */
    public function show(Ticket $ticket): Response
    {
        if ($ticket->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_helpdesk_index');
        }

        return $this->render('HelpdeskBundle/helpdesk/show.html.twig', [
            'ticket' => $ticket,
        ]);
    }

    /**
     * @Route("/{id}/comment", name="app_helpdesk_comment", methods={"POST"})
     */
    public function addComment(Request $request, Ticket $ticket, EntityManagerInterface $entityManager, MailerInterface $mailer): Response
    {
        if ($ticket->getUser() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_helpdesk_index');
        }

        $comment = new Comment();
        $comment->setContent($request->request->get('content'));
        $comment->setUser($this->getUser());
        $comment->setTicket($ticket);
        $entityManager->persist($comment);
        $entityManager->flush();

        // Send email to admin and user
        $this->sendTicketEmail($mailer, $ticket, 'comment_added');

        $this->addFlash('success', 'Comment added successfully!');

        return $this->redirectToRoute('app_helpdesk_show', ['id' => $ticket->getId()]);
    }

    /**
     * @Route("/faq/category/{id}", name="app_helpdesk_faq_category", methods={"GET"})
     */
    public function faqCategory(Category $category, FaqPostRepository $faqPostRepository, CategoryRepository $categoryRepository): Response
    {
        $posts = $faqPostRepository->findBy(['category' => $category]);
        $categories = $categoryRepository->findAll();

        return $this->render('HelpdeskBundle/helpdesk/faq_category.html.twig', [
            'category' => $category,
            'posts' => $posts,
            'categories' => $categories,
        ]);
    }

    /**
     * @Route("/faq/post/{id}", name="app_helpdesk_faq_post", methods={"GET"})
     */
    public function faqPost(FaqPost $faqPost): Response
    {
        return $this->render('HelpdeskBundle/helpdesk/faq_post.html.twig', [
            'post' => $faqPost,
        ]);
    }

    /**
     * @Route("/admin/faq/category/new", name="app_admin_faq_category_new", methods={"GET", "POST"})
     */
    public function newCategory(Request $request, EntityManagerInterface $entityManager): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        $category = new Category();
        $form = $this->createForm(CategoryType::class, $category);

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($category);
            $entityManager->flush();

            return $this->redirectToRoute('app_helpdesk_faq');
        }

        return $this->render('HelpdeskBundle/helpdesk/admin/category_new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    /**
     * @Route("/admin/faq/post/new", name="app_admin_faq_post_new", methods={"GET", "POST"})
     */
    public function newFaqPost(Request $request, EntityManagerInterface $entityManager, CategoryRepository $categoryRepository): Response
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_account_index', [], Response::HTTP_SEE_OTHER);
        }

        $faqPost = new FaqPost();
        $categoryId = $request->query->get('category');
        if ($categoryId) {
            $category = $categoryRepository->find($categoryId);
            if ($category) {
                $faqPost->setCategory($category);
            }
        }
        $form = $this->createForm(FaqPostType::class, $faqPost);

        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($faqPost);
            $entityManager->flush();

            return $this->redirectToRoute('app_helpdesk_faq_category', ['id' => $faqPost->getCategory()->getId()]);
        }

        return $this->render('HelpdeskBundle/helpdesk/admin/post_new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    private function sendTicketEmail(MailerInterface $mailer, Ticket $ticket, string $action, ?string $oldState = null): void
    {
        $user = $ticket->getUser();
        $adminEmail = 'support@elvtdfinance.com'; // Ersetze mit tatsächlicher Admin-Email
        $currentRequest = $this->requestStack->getCurrentRequest();
        $commenterUsername = $this->getUser() ? $this->getUser()->getUsername() : 'Unknown';
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