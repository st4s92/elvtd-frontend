<?php

namespace App\Form;

use App\Entity\Account;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;

class AccountType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Account Name (frei wählbar)',
            ])
            ->add('platform', ChoiceType::class, [
                'choices' => [
                    'MetaTrader 4' => 'mt4',
                    'MetaTrader 5' => 'mt5',
                    'cTrader' => 'ctrader',
                    'Tradovate' => 'tradovate',
                    'Bitget' => 'bitget',
                ],
                'placeholder' => 'Wähle eine Plattform aus',
                'attr' => ['class' => 'form-control'],
                'choice_attr' => function ($choice, $key, $value) {
                    if (in_array($value, ['tradovate', 'bitget'])) {
                        return ['disabled' => 'disabled'];
                    }
                    return [];
                },
            ])
            ->add('broker', TextType::class, [
                'label' => 'Broker (zB. "FTMO" oder "QUANTUM")',
            ])
            ->add('tradeServer', TextType::class, [
                'label' => 'Server (zB. "FTMO-Server" ODER: cTrader Email-Adresse)',
            ])
            ->add('login', TextType::class, [
                'label' => 'Login (Account Nummer)',
            ])
            ->add('password', PasswordType::class, [
                'label' => 'Password (ACHTUNG: NICHT DAS INVESTOR PASSWORT)',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver)
    {
        $resolver->setDefaults([
            'data_class' => Account::class,
        ]);
    }
}