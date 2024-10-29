<?php

namespace App\Livewire;

use Livewire\Component;
use Illuminate\Support\Facades\Http;

class ProcaptchaForm extends Component
{
    public $email = '';
    public $password = '';
    public $procaptcha = '';

    protected $rules = [
        'email' => 'required|email',
        'password' => 'required|min:6',
        'procaptcha' => 'required'
    ];

    public function submit()
    {
        $this->validate();

        $response = Http::post('https://api.prosopo.io/siteverify', [
            'secret' => env('PROCAPTCHA_SECRET_KEY'),
            'token' => $this->procaptcha
        ]);

        if ($response->successful() && $response->json('verified')) {
            session()->flash('message', 'Form submitted successfully!');
            $this->reset(['email', 'password']);
        } else {
            session()->flash('error', 'Verification failed');
        }
    }

    public function render()
    {
        return view('livewire.procaptcha-form')
            ->layout('components.layouts.app');
    }
}