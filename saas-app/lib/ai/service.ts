import { groq } from '../groq';

export class AIService {
    /**
     * Primary Chat (Groq)
     */
    static async chat(prompt: string, json: boolean = true): Promise<string> {
        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: json ? { type: "json_object" } : undefined,
            });
            return response.choices[0]?.message?.content || "";
        } catch (error) {
            console.error("Groq chat failed:", error);
            throw error;
        }
    }

    /**
     * Transcription (Groq Whisper)
     */
    static async transcribe(file: File): Promise<string> {
        return await groq.audio.transcriptions.create({
            file: file,
            model: "whisper-large-v3",
        }).then(res => res.text);
    }

    /**
     * Text-to-Speech (Placeholder - Groq doesn't support TTS yet)
     */
    static async speak(text: string): Promise<Response> {
        // Return empty audio or error since OpenAI is removed
        console.warn("TTS not supported without OpenAI");
        return new Response("TTS not available", { status: 501 });
    }
}
