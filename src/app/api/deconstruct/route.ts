import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

const DECONSTRUCT_SYSTEM_PROMPT = `You are a productivity expert. Break down the given task into 2-3 KEY MILESTONES, each with 2-3 actionable baby steps.

STRUCTURE:
- Each MILESTONE is a significant checkpoint (the "what")
- Each STEP under a milestone takes MAX 3 minutes (the "how")
- Include the "why" for each milestone

RULES:
1. Maximum 3 milestones per task
2. Maximum 3 steps per milestone
3. Steps must be specific and actionable (start with a verb)
4. Milestones should feel like achievements when completed

Return ONLY valid JSON:
{
  "milestones": [
    { "title": "Milestone title", "why": "Why this milestone matters", "steps": ["Step 1", "Step 2", "Step 3"] }
  ]
}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { task, context } = body;

        if (!task) {
            return NextResponse.json({ error: 'No task provided' }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const contextInfo = context ? `\nContext/Category: ${context}` : '';
        const userPrompt = `Task to break down:${contextInfo}\n"${task}"`;

        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
            model: MODEL,
            max_tokens: 1500,
            system: DECONSTRUCT_SYSTEM_PROMPT,
            messages: [
                { role: 'user', content: userPrompt },
                // Prefill with "{" to force a clean JSON object.
                { role: 'assistant', content: '{' },
            ],
        });

        const block = message.content[0];
        const raw = '{' + (block?.type === 'text' ? block.text : '');

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 });
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // New milestone format
        if (parsed.milestones && Array.isArray(parsed.milestones)) {
            return NextResponse.json({ milestones: parsed.milestones });
        }

        // Fallback: flat steps -> single milestone
        if (parsed.steps && Array.isArray(parsed.steps)) {
            return NextResponse.json({
                milestones: [{
                    title: 'Complete task',
                    why: 'Get it done',
                    steps: parsed.steps.slice(0, 3),
                }],
            });
        }

        return NextResponse.json({ error: 'Invalid response structure' }, { status: 500 });
    } catch (error) {
        console.error('Deconstruct error:', error);
        const status = (error as { status?: number })?.status;
        const message = error instanceof Error ? error.message : 'Processing failed';
        if (status === 401) {
            return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
        }
        if (status === 429) {
            return NextResponse.json({ error: 'Rate limited — wait a moment and retry' }, { status: 429 });
        }
        if (/credit balance is too low/i.test(message)) {
            return NextResponse.json({ error: 'Anthropic credit balance too low. Add credits at console.anthropic.com → Plans & Billing.' }, { status: 402 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
