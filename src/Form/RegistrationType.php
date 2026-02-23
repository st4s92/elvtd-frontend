<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\Regex;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Karser\Recaptcha3Bundle\Form\Recaptcha3Type;
use Karser\Recaptcha3Bundle\Validator\Constraints\Recaptcha3;

class RegistrationType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('username')
            ->add('firstname', TextType::class, [
                'label' => 'Vorname',
                'constraints' => [
                    new NotBlank([
                        'message' => 'Bitte gib einen Vornamen ein.',
                    ]),
                ],
            ])
            ->add('lastname', TextType::class, [
                'label' => 'Nachname',
                'constraints' => [
                    new NotBlank([
                        'message' => 'Bitte gib einen Nachnamen ein.',
                    ]),
                ],
            ])
            ->add('email')
            ->add('password', RepeatedType::class, [
                'type' => PasswordType::class,
                'mapped' => false,
                'first_options' => [
                    'label' => 'Passwort',
                    'attr' => ['class' => 'form-control'],
                ],
                'second_options' => [
                    'label' => 'Passwort wiederholen',
                    'attr' => ['class' => 'form-control'],
                ],
                'invalid_message' => 'Die eingegebenen Passwörter stimmen nicht überein.',
                'constraints' => [
                    new NotBlank([
                        'message' => 'Bitte gib ein Passwort ein.',
                    ]),
                    new Length([
                        'min' => 6,
                        'minMessage' => 'Das Passwort muss mindestens {{ limit }} Zeichen lang sein.',
                        'max' => 4096,
                    ]),
                    new Regex([
                        'pattern' => '/^(?=.*[A-Z])(?=.*[\W]).+$/',
                        'message' => 'Das Passwort muss mindestens einen Großbuchstaben und ein Sonderzeichen enthalten.',
                    ]),
                ],
            ])
/*            ->add('affiliatecode', TextType::class, [
                'label' => 'Einladungs-Code'
            ])*/
            ->add('recaptcha', Recaptcha3Type::class, [
                'constraints' => new Recaptcha3(),
                'action_name' => 'registration',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
