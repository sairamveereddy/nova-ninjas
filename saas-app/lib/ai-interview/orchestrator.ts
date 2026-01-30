import { AIService } from '../ai/service';
import { INTERVIEW_PROMPTS } from './prompts';
import { prisma } from '../prisma';

export class InterviewOrchestrator {
    private sessionId: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    async generateInitialQuestion() {
        const session = await prisma.interviewSession.findUnique({
            where: { id: this.sessionId },
            include: { resume: true },
        });

        if (!session) throw new Error('Session not found');

        const prompt = INTERVIEW_PROMPTS.INITIAL_QUESTION
            .replace('{{profile}}', JSON.stringify(session.resume.structuredJson || session.resume.parsedText))
            .replace('{{jd}}', session.jobDescription);

        const response = await AIService.chat(prompt, true);
        const result = JSON.parse(response || '{}');

        // Save the turn
        await prisma.interviewTurn.create({
            data: {
                sessionId: this.sessionId,
                turnNumber: 1,
                questionText: result.question,
            }
        });

        return result;
    }

    async processAnswerAndGetNext(answerText: string) {
        const session = await prisma.interviewSession.findUnique({
            where: { id: this.sessionId },
            include: {
                resume: true,
                turns: { orderBy: { turnNumber: 'asc' } }
            },
        });

        if (!session) throw new Error('Session not found');

        const currentTurnNumber = session.turns.length;

        // Update current turn with answer
        await prisma.interviewTurn.update({
            where: { id: session.turns[currentTurnNumber - 1].id },
            data: { answerText }
        });

        // Check if we reached the target question count
        if (session.questionCount >= session.targetQuestions) {
            return { status: 'completed' };
        }

        // Generate next question
        const history = session.turns.map(t => `Q: ${t.questionText}\nA: ${t.answerText}`).join('\n\n');

        const prompt = INTERVIEW_PROMPTS.NEXT_TURN
            .replace('{{profile}}', JSON.stringify(session.resume.structuredJson || session.resume.parsedText))
            .replace('{{jd}}', session.jobDescription)
            .replace('{{history}}', history)
            .replace('{{lastAnswer}}', answerText);

        const response = await AIService.chat(prompt, true);
        const result = JSON.parse(response || '{}');

        // Create next turn
        await prisma.interviewTurn.create({
            data: {
                sessionId: this.sessionId,
                turnNumber: currentTurnNumber + 1,
                questionText: result.question,
            }
        });

        // Update session count
        await prisma.interviewSession.update({
            where: { id: this.sessionId },
            data: { questionCount: { increment: 1 } }
        });

        return { status: 'active', ...result };
    }

    async finalizeAndGenerateReport() {
        const session = await prisma.interviewSession.findUnique({
            where: { id: this.sessionId },
            include: {
                resume: true,
                turns: { orderBy: { turnNumber: 'asc' } }
            },
        });

        if (!session) throw new Error('Session not found');

        const transcript = session.turns.map(t => `Q: ${t.questionText}\nA: ${t.answerText}`).join('\n\n');

        const prompt = INTERVIEW_PROMPTS.FINAL_REPORT
            .replace('{{profile}}', JSON.stringify(session.resume.structuredJson || session.resume.parsedText))
            .replace('{{jd}}', session.jobDescription)
            .replace('{{transcript}}', transcript);

        const response = await AIService.chat(prompt, true);
        const result = JSON.parse(response || '{}');

        // Save report
        const report = await prisma.evaluationReport.create({
            data: {
                sessionId: this.sessionId,
                summary: result.summary,
                strengths: result.strengths,
                gaps: result.gaps,
                repetition: result.repetition,
                actionableFixes: result.actionableFixes,
                scores: result.scores,
                rewrittenAnswers: result.rewrittenAnswers,
                roleFitScore: result.roleFitScore,
            }
        });

        await prisma.interviewSession.update({
            where: { id: this.sessionId },
            data: { status: 'completed' }
        });

        return report;
    }
}
