<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;

class UserType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('username', TextType::class, [
                'label' => 'Username',
                'attr' => ['class' => 'form-control mb-4']
            ])
            ->add('firstname', TextType::class, [
                'label' => 'Vorname',
                'attr' => ['class' => 'form-control mb-4']
            ])
            ->add('lastname', TextType::class, [
                'label' => 'Nachname',
                'attr' => ['class' => 'form-control mb-4']
            ])
            ->add('password',PasswordType::class, [
                'label' => 'Password',
                'attr' => ['class' => 'form-control mb-4']
            ])
            ->add('email', TextType::class, [
                'label' => 'Email',
                'attr' => ['class' => 'form-control mb-4']
            ])
            ->add('language', ChoiceType::class, [
                'label' => 'Sprache',
                'choices' => [
                    'German' => 'de',
                    'English' => 'en',
                ],
                'placeholder' => 'Wähle eine Sprache aus',
                'attr' => ['class' => 'form-control mb-4']
            ])
            ->add('darkmode', ChoiceType::class, [
                'label' => 'Interface',
                'choices' => [
                    'Lightmode' => '0',
                    'Darkmode' => '1',
                ],
                'placeholder' => 'Wähle ein Theme aus',
                'attr' => ['class' => 'form-control']
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
