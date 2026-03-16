<?php
require __DIR__ . '/vendor/autoload.php';
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$agentRepo = $container->get('doctrine')->getRepository(App\Entity\Agent::class);
$accountRepo = $container->get('doctrine')->getRepository(App\Entity\Account::class);

$agent = $agentRepo->findOneBy(['meta_id' => '58uT']);
if ($agent) {
    echo "Agent Name: " . $agent->getName() . "\n";
    echo "Agent From Account ID: " . $agent->getFromAccountId() . "\n";
    
    $account = $accountRepo->find($agent->getFromAccountId());
    if ($account) {
        echo "Master Account Login: " . $account->getLogin() . "\n";
        echo "Master Account Host: " . $account->getHost() . "\n";
    } else {
        echo "Master Account not found.\n";
    }
} else {
    echo "Agent 58uT not found.\n";
}
