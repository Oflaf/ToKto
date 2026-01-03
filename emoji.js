// emoji.js
document.addEventListener('DOMContentLoaded', () => {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const userInput = document.getElementById('user-input');

    // Lista popularnych emoji
    const emojis = [
        '😀', '😂', '😍', '😊', '😎', '😢', '😭', '😡', '👍', '👎', '❤️', '💔', '🔥', '⭐',
        '🎉', '🤔', '🙄', '😜', '😇', '😈', '👋', '🙏', '💯', '🤷', '🤦', '✅', '❌', '👉',
        '👈', '👆', '👇', '👌', '✌️', '😉', '😘', '🙈', '🙉', '🙊', '💖', '😅', '🤣', '🥰',
        '🥳', '🥺', '🤯', '😱', '😴', '🤮', '🤑', '🤫', '🤪', '💀', '👽', '🤖', '👀', '🧠'
    ];

    // Wypełnij selektor emoji
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.classList.add('emoji');
        span.textContent = emoji;
        emojiPicker.appendChild(span);
    });

    // Pokaż/ukryj selektor po kliknięciu ikony
    emojiBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Zapobiega natychmiastowemu zamknięciu przez listener na dokumencie
        emojiPicker.classList.toggle('visible');
    });

    // Wstaw emoji do pola tekstowego
    emojiPicker.addEventListener('click', (event) => {
        if (event.target.classList.contains('emoji')) {
            
            // === POCZĄTEK MODYFIKACJI ===
            // SPRAWDŹ, CZY POLE INPUT JEST AKTYWNE. JEŚLI NIE, PRZERWIJ.
            if (userInput.disabled) {
                return; 
            }
            // === KONIEC MODYFIKACJI ===

            const emoji = event.target.textContent;
            
            // Wstawia emoji w miejscu kursora
            const start = userInput.selectionStart;
            const end = userInput.selectionEnd;
            const text = userInput.value;
            
            userInput.value = text.substring(0, start) + emoji + text.substring(end);
            
            // Ustaw kursor za wstawionym emoji
            userInput.selectionStart = userInput.selectionEnd = start + emoji.length;
            
            // Ustaw focus z powrotem na textarea
            userInput.focus();
        }
    });

    // Ukryj selektor po kliknięciu gdziekolwiek indziej
    document.addEventListener('click', (event) => {
        if (!emojiPicker.contains(event.target) && event.target !== emojiBtn) {
            emojiPicker.classList.remove('visible');
        }
    });
});