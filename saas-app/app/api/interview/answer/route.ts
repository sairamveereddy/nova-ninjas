import { NextRequest, NextResponse } from 'next/server';
import { InterviewOrchestrator } from '@/lib/ai-interview/orchestrator';
import { AIService } from '@/lib/ai/service';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const sessionId = formData.get('sessionId') as string;
        const audioFile = formData.get('audio') as File;
        const textAnswer = formData.get('text') as string;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        let finalAnswer = textAnswer;

        // Handle audio transcription if audio is provided
        if (audioFile) {
            finalAnswer = await AIService.transcribe(audioFile);
        }

        if (!finalAnswer) {
            return NextResponse.json({ error: 'No answer provided' }, { status: 400 });
        }

        const orchestrator = new InterviewOrchestrator(sessionId);
        const result = await orchestrator.processAnswerAndGetNext(finalAnswer);

        return NextResponse.json({
            success: true,
            answerTranscript: finalAnswer,
            ...result
        });

    } catch (error) {
        console.error('Answer processing error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
