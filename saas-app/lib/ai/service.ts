import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const genAI = process.env.GOOGLE_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
    : null;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
    /**
     * Primary Chat (Groq) with Gemini fallback
     */
    static async chat(prompt: string, json: boolean = true): Promise<string> {
        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: json ? { type: "json_object" } : undefined,
            });
            return response.choices[0].message.content || "";
        } catch (error) {
            console.warn("Groq chat failed, falling back to Gemini:", error);
            if (genAI) {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);
                let text = result.response.text();
                // Simple JSON extractor for Gemini if it doesn't strictly follow the schema
                if (json && !text.startsWith('{')) {
                    const match = text.match(/\{[\s\S]*\}/);
                    if (match) text = match[0];
                }
                return text;
            }
            throw error;
        }
    }

    /**
     * Transcription (Groq Whisper)
     */
    static async transcribe(file: File): Promise<string> {
        try {
            const transcription = await groq.audio.transcriptions.create({
                file,
                model: "whisper-large-v3",
            });
            return transcription.text;
        } catch (error) {
            console.warn("Groq transcription failed, falling back to OpenAI:", error);
            const transcription = await openai.audio.transcriptions.create({
                file,
                model: "whisper-1",
            });
            return transcription.text;
        }
    }

    /**
     * Text-to-Speech (OpenAI)
     */
    static async speak(text: string): Promise<Response> {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        return new Response(buffer, {
            headers: { 'Content-Type': 'audio/mpeg' },
        });
    }
}
