const AZURE_KEY = import.meta.env.VITE_AZURE_TRANSLATOR_KEY || "";
const AZURE_REGION = import.meta.env.VITE_AZURE_TRANSLATOR_REGION || "";
const AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate";
import { fetch } from '@tauri-apps/plugin-http';

interface AzureTranslation {
    text: string;
    to: string;
}

interface AzureResponse {
    translations: AzureTranslation[];
}

/**
 * Translates text using the Microsoft Azure Translator API.
 * Automatically falls back to the original text if the API key is missing or the request fails.
 * 
 * @param text The text to translate
 * @param targetLang The target language code (e.g., 'pt', 'en'). Azure uses 2-letter codes mostly.
 * @returns The translated text, or the original text if translation fails
 */
export async function translateText(text: string | null | undefined, targetLang: string = 'pt'): Promise<string> {
    if (!text) return "";

    // Fail safe for missing keys
    if (!AZURE_KEY || !AZURE_REGION) {
        console.debug("Azure Translator key or region missing, returning original text.");
        return text;
    }

    // Optimization: Don't translate English to English
    if (targetLang.toLowerCase().startsWith('en')) return text;

    // Azure expects strict codes: 'pt' covers 'pt-PT' mostly, but let's be safe
    // For Azure, 'pt' is Brazilian and 'pt-pt' is Portugal.
    const azureLang = targetLang.toLowerCase() === 'pt-pt' ? 'pt-pt' : 'pt';

    try {
        const url = new URL(AZURE_ENDPOINT);
        url.searchParams.append("api-version", "3.0");
        url.searchParams.append("from", "en");
        url.searchParams.append("to", azureLang);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": AZURE_KEY,
                "Ocp-Apim-Subscription-Region": AZURE_REGION,
                "Content-Type": "application/json",
            },
            body: JSON.stringify([{ "Text": text }]),
        });

        if (!response.ok) {
            console.error("Azure API error:", response.status, response.statusText);
            const errBody = await response.text();
            console.error("Azure error body:", errBody);
            // DEBUG: Alert the user if dev mode
            if (import.meta.env.DEV) {
                console.warn(`Translation Failed. Status: ${response.status}. Region: ${AZURE_REGION}. Check console for details.`);
            }
            return text;
        }

        const data: AzureResponse[] = await response.json();
        if (data && data.length > 0 && data[0].translations && data[0].translations.length > 0) {
            return data[0].translations[0].text;
        }

        return text;
    } catch (error) {
        console.error("Translation error:", error);
        return text;
    }
}
