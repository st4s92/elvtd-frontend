<?php

namespace App\HelpdeskBundle\Form;

use App\HelpdeskBundle\Entity\FaqPost;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class FaqPostType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, [
                'label' => 'Title',
                'required' => true,
                'attr' => ['class' => 'form-control w-100 mb-4'],
            ])
            ->add('content', TextareaType::class, [
                'label' => 'Content (HTML)',
                'required' => true,
                'attr' => ['class' => 'form-control w-100 mb-4'],
            ])
            ->add('url', TextType::class, [
                'label' => 'URL',
                'required' => false,
                'attr' => ['class' => 'form-control w-100 mb-4'],
            ])
            ->add('category', null, [
                'label' => 'Category',
                'required' => true,
                'attr' => ['class' => 'form-control w-100 mb-4'],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => FaqPost::class,
        ]);
    }
}