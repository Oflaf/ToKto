document.addEventListener('DOMContentLoaded', () => {
    const popup1 = document.getElementById('popup1');
    const popup2 = document.getElementById('popup2');

    const confirmBtn1 = document.getElementById('confirm-btn-1');
    const declineBtn1 = document.getElementById('decline-btn-1');

    const confirmBtn2 = document.getElementById('confirm-btn-2');
    const declineBtn2 = document.getElementById('decline-btn-2');
    
    // Pokaż pierwszy popup od razu po załadowaniu strony
    if (popup1) {
        popup1.classList.remove('hidden');
    }

    // Funkcja przekierowująca na Google
    const decline = () => {
        window.location.href = 'https://google.com';
    };

    // Event Listenery dla pierwszego popupa
    if (confirmBtn1) {
        confirmBtn1.addEventListener('click', () => {
            popup1.classList.add('hidden');
            if (popup2) {
                popup2.classList.remove('hidden');
            }
        });
    }

    if (declineBtn1) {
        declineBtn1.addEventListener('click', decline);
    }

    // Event Listenery dla drugiego popupa
     confirmBtn2.addEventListener('click', () => {
        popup2.classList.add('hidden');
        localStorage.setItem('popupConsent', 'true'); // Zapisz zgodę

        // === POCZĄTEK MODYFIKACJI ===
        // Sprawdź, czy funkcja CAPTCHA istnieje i ją wywołaj
        if (typeof window.showCaptcha === 'function') {
            window.showCaptcha();
        }
        // === KONIEC MODYFIKACJI ===
    });
    if (declineBtn2) {
        declineBtn2.addEventListener('click', decline);
    }
});