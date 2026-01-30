import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/service';

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        return await AIService.speak(text);

    } catch (error) {
        console.error('TTS error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
