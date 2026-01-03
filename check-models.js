require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error("BŁĄD: Nie można odnaleźć klucza GOOGLE_API_KEY w pliku .env!");
    process.exit(1);
}

const LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function getAvailableModels() {
    console.log("Sprawdzam, jakie modele są faktycznie dostępne dla Twojego klucza...");
    try {
        const response = await fetch(LIST_MODELS_URL);
        const data = await response.json();

        if (!response.ok || !data.models) {
            console.error("\nBłąd podczas pobierania listy modeli. Odpowiedź od Google:");
            console.error(JSON.stringify(data, null, 2));
            return;
        }

        console.log("\n✅ Sukces! Oto lista modeli, których MOŻESZ używać:");
        
        data.models.forEach(model => {
            if (model.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${model.name}`);
            }
        });

        console.log("\nInstrukcja: Skopiuj jedną z powyższych nazw (np. 'models/gemini-pro') i wklej ją do pliku server.js.");

    } catch (error) {
        console.error("\nBłąd krytyczny podczas próby połączenia z API:", error);
    }
}

getAvailableModels();