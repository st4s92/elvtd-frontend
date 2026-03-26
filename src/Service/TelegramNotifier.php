<?php

namespace App\Service;

use App\HelpdeskBundle\Entity\Ticket;
use App\Repository\AccountRepository;
use Psr\Log\LoggerInterface;

class TelegramNotifier
{
    private string $botToken = '8739222448:AAGnMTU7-tm4pi52KxNyDxtUMOi4aDhGeI0';
    private string $chatId = '1548706478';
    private LoggerInterface $logger;
    private AccountRepository $accountRepository;
    private GroqService $groqService;

    public function __construct(LoggerInterface $logger, AccountRepository $accountRepository, GroqService $groqService)
    {
        $this->logger = $logger;
        $this->accountRepository = $accountRepository;
        $this->groqService = $groqService;
    }

    public function notifyTicketCreated(Ticket $ticket): void
    {
        $user = $ticket->getUser();
        $username = $user ? $user->getUsername() : 'Unknown';

        $message = "🎫 Neues Ticket erstellt\n\n"
            . "Ticket #" . $ticket->getId() . "\n"
            . "Titel: " . $ticket->getTitle() . "\n"
            . "Von: " . $username . "\n"
            . "Status: " . $ticket->getStatus() . "\n\n"
            . "Beschreibung:\n" . $this->truncate($ticket->getDescription(), 500)
            . $this->buildAccountsSummary($user);

        $suggestion = $this->groqService->generateSuggestion($ticket);
        if ($suggestion) {
            $message .= "\n\n✏️ Antwortvorschlag:\n" . $suggestion;
            $this->sendWithButtons($message, $ticket->getId());
        } else {
            $this->send($message);
        }
    }

    public function notifyTicketComment(Ticket $ticket, string $commenterUsername, string $commentContent): void
    {
        $user = $ticket->getUser();

        $message = "💬 Neue Nachricht zu Ticket\n\n"
            . "Ticket #" . $ticket->getId() . "\n"
            . "Titel: " . $ticket->getTitle() . "\n"
            . "Von: " . $commenterUsername . "\n\n"
            . "Nachricht:\n" . $this->truncate($commentContent, 500)
            . $this->buildAccountsSummary($user);

        // Only generate suggestion if the commenter is the customer (not support)
        if ($user && $commenterUsername === $user->getUsername()) {
            $suggestion = $this->groqService->generateSuggestion($ticket);
            if ($suggestion) {
                $message .= "\n\n✏️ Antwortvorschlag:\n" . $suggestion;
                $this->sendWithButtons($message, $ticket->getId());
                return;
            }
        }

        $this->send($message);
    }

    public function notifyTicketStatusChanged(Ticket $ticket, string $oldStatus, string $newStatus): void
    {
        $statusLabels = [
            'open' => 'Offen',
            'in_progress' => 'In Bearbeitung',
            'closed' => 'Geschlossen',
        ];

        $oldLabel = $statusLabels[$oldStatus] ?? $oldStatus;
        $newLabel = $statusLabels[$newStatus] ?? $newStatus;
        $user = $ticket->getUser();

        $message = "🔄 Ticket-Status geändert\n\n"
            . "Ticket #" . $ticket->getId() . "\n"
            . "Titel: " . $ticket->getTitle() . "\n"
            . "Status: " . $oldLabel . " ➜ " . $newLabel
            . $this->buildAccountsSummary($user);

        $this->send($message);
    }

    public function notifyUserRegistered($user): void
    {
        $username = $user->getUsername();
        $email = $user->getEmail();
        $firstname = method_exists($user, 'getFirstname') ? $user->getFirstname() : '';
        $lastname = method_exists($user, 'getLastname') ? $user->getLastname() : '';
        $name = trim($firstname . ' ' . $lastname);

        $message = "👤 Neuer User registriert\n\n"
            . "Username: " . $username . "\n"
            . "Name: " . ($name ?: '-') . "\n"
            . "E-Mail: " . $email;

        $this->send($message);
    }

    public function notifyAccountAdded($account): void
    {
        $user = $account->getUser();
        $username = $user ? $user->getUsername() : 'Unknown';

        $message = "➕ Neuer Account hinzugefügt\n\n"
            . "User: " . $username . "\n"
            . "Account: #" . $account->getLogin() . " (" . $account->getName() . ")\n"
            . "Broker: " . $account->getBroker() . "\n"
            . "Plattform: " . $account->getPlatform() . "\n"
            . "Host: " . ($account->getHost() ?: '-')
            . $this->buildAccountsSummary($user);

        $this->send($message);
    }

    public function notifyAccountDeleted($account): void
    {
        $user = $account->getUser();
        $username = $user ? $user->getUsername() : 'Unknown';

        $message = "🗑 Account gelöscht\n\n"
            . "User: " . $username . "\n"
            . "Account: #" . $account->getLogin() . " (" . $account->getName() . ")\n"
            . "Broker: " . $account->getBroker() . "\n"
            . "Plattform: " . $account->getPlatform();

        $this->send($message);
    }

    public function answerCallback(string $callbackId, string $text): void
    {
        $url = "https://api.telegram.org/bot{$this->botToken}/answerCallbackQuery";
        $payload = [
            'callback_query_id' => $callbackId,
            'text' => $text,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_exec($ch);
        curl_close($ch);
    }

    public function editMessageButtons(string $chatId, int $messageId, string $statusText): void
    {
        $url = "https://api.telegram.org/bot{$this->botToken}/editMessageReplyMarkup";
        $payload = [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'reply_markup' => json_encode(['inline_keyboard' => [[
                ['text' => '✅ ' . $statusText, 'callback_data' => 'noop'],
            ]]]),
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_exec($ch);
        curl_close($ch);
    }

    private function buildAccountsSummary($user): string
    {
        if (!$user) {
            return '';
        }

        $accounts = $this->accountRepository->findBy(['user' => $user]);
        if (empty($accounts)) {
            return "\n\n📊 Accounts: Keine";
        }

        $lines = "\n\n📊 Accounts des Users:\n";
        foreach ($accounts as $account) {
            $status = $account->getIsActive() ? '🟢' : '🔴';
            $name = $account->getName();
            $broker = $account->getBroker();
            $balance = number_format($account->getBalance(), 2, ',', '.');
            $equity = number_format($account->getEquity(), 2, ',', '.');

            $host = $account->getHost() ?: '-';
            $platform = $account->getPlatform();
            $login = $account->getLogin();

            $lines .= $status . " " . $name . " (" . $broker . ")\n"
                . "   #" . $login . " | " . $platform . " | " . $host . "\n"
                . "   Balance: $" . $balance . " | Equity: $" . $equity . "\n";
        }

        return $lines;
    }

    private function send(string $message): void
    {
        $url = "https://api.telegram.org/bot{$this->botToken}/sendMessage";

        $payload = [
            'chat_id' => $this->chatId,
            'text' => $message,
        ];

        $this->curlPost($url, $payload);
    }

    private function sendWithButtons(string $message, int $ticketId): void
    {
        $url = "https://api.telegram.org/bot{$this->botToken}/sendMessage";

        $inlineKeyboard = [
            'inline_keyboard' => [[
                ['text' => '📤 Abschicken', 'callback_data' => 'send_' . $ticketId],
                ['text' => '❌ Ignorieren', 'callback_data' => 'ignore_' . $ticketId],
            ]],
        ];

        $payload = [
            'chat_id' => $this->chatId,
            'text' => $message,
            'reply_markup' => json_encode($inlineKeyboard),
        ];

        $this->curlPost($url, $payload);
    }

    private function curlPost(string $url, array $payload): void
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->logger->error('Telegram API request failed', [
                'http_code' => $httpCode,
                'response' => $response,
            ]);
        }
    }

    private function truncate(string $text, int $maxLength): string
    {
        if (mb_strlen($text) <= $maxLength) {
            return $text;
        }
        return mb_substr($text, 0, $maxLength) . '...';
    }
}
