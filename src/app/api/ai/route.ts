import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const requestSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  messages: z.array(messageSchema).max(20).optional().default([]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Faça login para usar o assistente." }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Pergunta inválida." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "O assistente ainda não está configurado." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey });
    const history = parsed.data.messages.map((message) => ({ role: message.role, content: message.content }));
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é o Assistente Smash. Responda em português do Brasil, com clareza e concisão, sobre regras, pontuação, rodadas e classificação do Ranking Smash. Não invente dados específicos do banco." },
        ...history,
        { role: "user", content: parsed.data.question },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "O assistente não retornou uma resposta." }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Erro no assistente:", error);
    return NextResponse.json({ error: "Não foi possível consultar o assistente agora." }, { status: 500 });
  }
}
