// Kera, CodeMax's Open WebUI, is Kera Browser's one provider. Its address is fixed; a user adds only their own Kera
// API key (in Kera: Settings → Account → API keys). Requests go to Open WebUI's OpenAI-compatible endpoint, which
// resolves the model with the key owner's access and attributes the spend to them.
export const KERA_BASE_URL = 'https://kera.cdmx.io/api';
/** The model the welcome page picks first when the key sees it. */
export const KERA_DEFAULT_MODEL = 'gpt-6-luna';
