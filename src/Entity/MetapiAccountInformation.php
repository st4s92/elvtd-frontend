<?php

namespace App\Model;

class MetapiAccountInformation
{
    private string $accountId;
    private string $name;
    private float $balance;
    private float $equity;

    public function __construct(array $data)
    {
        $this->accountId = $data['accountId'];
        $this->name = $data['name'];
        $this->balance = $data['balance'];
        $this->equity = $data['equity'];
    }

    public function getAccountId(): string { return $this->accountId; }
    public function getName(): string { return $this->name; }
    public function getBalance(): float { return $this->balance; }
    public function getEquity(): float { return $this->equity; }
}