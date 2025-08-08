import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousMultiAgentAnalysis, DEFAULT_MAX_TURNS } from '@/lib/agents/autonomous-multi-agent-analyzer';

export const runtime = 'nodejs'; // Enable Node.js runtime for OpenAI Agents

export async function POST(request: NextRequest) {
  try {
    const { pitch, maxTurns, investors } = await request.json();

    if (!pitch || typeof pitch !== 'string') {
      return new NextResponse(JSON.stringify({ success: false, error: 'Pitch content is required' }), { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse(JSON.stringify({ success: false, error: 'OpenAI API key not configured.' }), { status: 500 });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🚀 Starting REAL autonomous agent discussion stream...');
          
          const turns = typeof maxTurns === 'number' && maxTurns > 0 ? maxTurns : DEFAULT_MAX_TURNS;
          for await (const event of runAutonomousMultiAgentAnalysis(pitch, turns, Array.isArray(investors) ? investors : undefined)) {
            console.log('Streaming real AI event:', event.type, event.agent);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            
            // Add small delay between events for better UX
            if (event.type === 'agent_message') {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          controller.enqueue(encoder.encode('data: {"type": "stream_complete"}\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('Real autonomous discussion stream error:', error);
          controller.enqueue(encoder.encode(`data: {"type": "error", "error": "${error instanceof Error ? error.message : 'Unknown stream error'}"}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in autonomous analyze-pitch API:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { status: 500 }
    );
  }
}