<div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <form wire:submit.prevent="submit">
            <div class="mb-4">
                <input wire:model="email" 
                       type="email" 
                       placeholder="Email"
                       class="w-full p-2 border rounded">
                @error('email') <span class="text-red-500 text-sm">{{ $message }}</span> @enderror
            </div>

            <div class="mb-4">
                <input wire:model="password" 
                       type="password" 
                       placeholder="Password"
                       class="w-full p-2 border rounded">
                @error('password') <span class="text-red-500 text-sm">{{ $message }}</span> @enderror
            </div>

            <div class="mb-4" wire:ignore>
                <div class="procaptcha" 
                     data-sitekey="{{ env('PROCAPTCHA_SITE_KEY') }}"
                     data-callback="onProcaptchaVerified"
                     data-cleanup="false"></div>
            </div>

            <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded">Submit</button>

            @if (session()->has('message'))
                <div class="mt-4 p-2 bg-green-100 text-green-700 rounded">
                    {{ session('message') }}
                </div>
            @endif

            @if (session()->has('error'))
                <div class="mt-4 p-2 bg-red-100 text-red-700 rounded">
                    {{ session('error') }}
                </div>
            @endif
        </form>
    </div>

    <script>
        function onProcaptchaVerified(token) {
            @this.set('procaptcha', token);
        }
    </script>
</div>