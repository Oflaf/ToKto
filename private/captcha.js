// captcha.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Konfiguracja ---
    const CAPTCHA_TRIGGER_COUNT = 5; // Wyświetl CAPTCHA co 5 rozmów
    const TOTAL_CAPTCHAS = 30;       // Liczba obrazków CAPTCHA w folderze /public/img/captcha/

    let conversationCount = 0;
    let currentCaptchaSolution = '';

    // Wklejona lista rozwiązań. Każda linia odpowiada obrazkowi N.jpg
    const captchaSolutions = [
        "A7B3K", "M9P2L", "JP237", "R1T8D", "X5G7H",
        "N2C9S", "V8J1B", "K3L6M", "F0D4P", "Y7H2R",
        "B5Q8W", "S1N3V", "L6T9X", "J4G2C", "D8M5K",
        "P3F7Z", "W9B1L", "C2H6R", "T0K4S", "Q5N8V",
        "G7L1D", "R3P9Y", "M6F2J", "H8C5X", "N1B4W",
        "V2T7K", "L9D0P", "J5G3S", "F6H8M", "Y2K1R"
    ];

    // --- Elementy DOM ---
    const captchaOverlay = document.getElementById('captcha-overlay');
    const captchaContent = document.querySelector('.captcha-content');
    const captchaImage = document.getElementById('captcha-image');
    const captchaInput = document.getElementById('captcha-input');
    const captchaSubmitBtn = document.getElementById('captcha-submit-btn');
    const captchaError = document.getElementById('captcha-error');
    const mainControlBtn = document.getElementById('control-btn');

    // --- Funkcje ---

    /**
     * Pokazuje okno modalne z losowo wybraną CAPTCHĄ.
     */
    const showCaptcha = () => {
        captchaInput.value = '';
        captchaError.textContent = '';
        
        const randomIndex = Math.floor(Math.random() * TOTAL_CAPTCHAS); // Losowy indeks od 0 do 29
        const imageNumber = randomIndex + 1; // Numer obrazka od 1 do 30
        
        captchaImage.src = `public/img/captcha/${imageNumber}.jpg`;
        currentCaptchaSolution = captchaSolutions[randomIndex];
        
        captchaOverlay.classList.add('visible');
        
        if (mainControlBtn) {
            mainControlBtn.disabled = true;
            mainControlBtn.title = 'Rozwiąż CAPTCHA, aby kontynuować';
        }
        
        captchaInput.focus();
    };

    // === POCZĄTEK MODYFIKACJI ===
    // Udostępnij funkcję showCaptcha globalnie
    window.showCaptcha = showCaptcha;
    /**
     * Ukrywa okno modalne CAPTCHA i odblokowuje funkcjonalność czatu.
     */
    const hideCaptcha = () => {
        captchaOverlay.classList.remove('visible');
        
        if (mainControlBtn && !document.body.classList.contains('is-banned')) { // Sprawdzenie is-banned byłoby dobrą praktyką
            mainControlBtn.disabled = false;
            mainControlBtn.title = 'Połącz';
        }
    };

    /**
     * Weryfikuje wprowadzony przez użytkownika kod.
     */
    const verifyCaptcha = () => {
        const userInput = captchaInput.value.trim().toUpperCase();
        
        if (userInput === currentCaptchaSolution) {
            // Sukces
            conversationCount = 0; // Resetuj licznik rozmów
            hideCaptcha();
        } else {
            // Błąd
            captchaError.textContent = 'Nieprawidłowy kod. Spróbuj ponownie.';
            captchaInput.value = '';
            captchaInput.focus();

            // Potrząśnij oknem dla lepszego efektu wizualnego
            captchaContent.classList.add('shake');
            setTimeout(() => captchaContent.classList.remove('shake'), 500);
        }
    };

    /**
     * Funkcja publiczna, wywoływana z script.js po zakończeniu każdej rozmowy.
     */
    window.incrementConversationCount = () => {
        conversationCount++;
        if (conversationCount >= CAPTCHA_TRIGGER_COUNT) {
            // Użyj setTimeout, aby dać użytkownikowi chwilę na przeczytanie wiadomości o rozłączeniu
            setTimeout(showCaptcha, 1000);
        }
    };

    // --- Event Listeners ---
    if (captchaSubmitBtn) {
        captchaSubmitBtn.addEventListener('click', verifyCaptcha);
    }
    
    if (captchaInput) {
        captchaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyCaptcha();
            }
        });
    }
});