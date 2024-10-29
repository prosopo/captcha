<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Procaptcha Demo</title>
    <script type="module" src="https://js.prosopo.io/js/procaptcha.bundle.js" async defer></script>
    <script src="https://cdn.tailwindcss.com"></script>
    @livewireStyles
</head>
<body>
    <main>
        {{ $slot }}
    </main>
    
    @livewireScripts
</body>
</html>