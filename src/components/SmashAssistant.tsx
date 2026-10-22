"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type MessageRole = "assistant" | "user";

interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface AssistantResponse {
  answer?: string;
  message?: string;
  error?: string;
}

const INITIAL_MESSAGE: AssistantMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Olá! Sou o Assistente Smash. Posso ajudar com regras, pontuação, rodadas, classificação, promoções, rebaixamentos e Finals da Smash. Como posso ajudar?",
};

const SUGGESTED_QUESTIONS = [
  "Como funciona a pontuação?",
  "Quais são os critérios de desempate?",
  "Como funciona a Finals da Smash?",
  "Como são definidos promoção e rebaixamento?",
];

function createMessageId(role: MessageRole): string {
  if (
    typeof globalThis !== "undefined" &&
    "crypto" in globalThis &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${role}-${globalThis.crypto.randomUUID()}`;
  }

  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SmashAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    INITIAL_MESSAGE,
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canSubmit = question.trim().length > 0 && !isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function sendQuestion(value: string) {
    const normalizedQuestion = value.trim();

    if (!normalizedQuestion || isLoading) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: createMessageId("user"),
      role: "user",
      content: normalizedQuestion,
    };

    const conversation = [...messages, userMessage];

    setMessages(conversation);
    setQuestion("");
    setError(null);
    setIsLoading(true);

    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          question: normalizedQuestion,
          messages: conversation.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | AssistantResponse
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error ??
            data?.message ??
            "Não foi possível consultar o Assistente Smash.",
        );
      }

      const assistantContent = data?.answer ?? data?.message;

      if (!assistantContent?.trim()) {
        throw new Error("O assistente retornou uma resposta vazia.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: assistantContent.trim(),
        },
      ]);
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ocorreu um erro inesperado. Tente novamente.",
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }

      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (canSubmit) {
        void sendQuestion(question);
      }
    }
  }

  function clearConversation() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setMessages([INITIAL_MESSAGE]);
    setQuestion("");
    setError(null);
    setIsLoading(false);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  return (
    <section
      aria-labelledby="smash-assistant-title"
      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
    >
      <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xl shadow-lg shadow-emerald-950/30"
          >
            🎾
          </div>

          <div>
            <h2
              id="smash-assistant-title"
              className="text-lg font-bold text-white"
            >
              Assistente Smash
            </h2>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-emerald-400"
              />
              <span>Ajuda sobre o Ranking Smash</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={clearConversation}
          disabled={isLoading}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpar conversa
        </button>
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="h-[420px] space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${
                  isUser
                    ? "rounded-br-md bg-emerald-500 text-slate-950"
                    : "rounded-bl-md border border-slate-700 bg-slate-800 text-slate-100"
                }`}
              >
                <span className="mb-1 block text-xs font-bold opacity-70">
                  {isUser ? "Você" : "Assistente Smash"}
                </span>

                <p className="whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
              <span className="sr-only">Assistente digitando</span>

              <div aria-hidden="true" className="flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-800 bg-slate-950/40 px-4 py-4 sm:px-6">
        {messages.length === 1 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Perguntas sugeridas
            </p>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendQuestion(suggestion)}
                  disabled={isLoading}
                  className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Fechar mensagem de erro"
              className="shrink-0 font-bold text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="smash-assistant-question" className="sr-only">
              Digite sua pergunta
            </label>

            <textarea
              ref={textareaRef}
              id="smash-assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={2}
              maxLength={1000}
              placeholder="Pergunte sobre regras, rodadas ou classificação..."
              className="max-h-40 min-h-[52px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
              <span>Enter para enviar · Shift + Enter para nova linha</span>
              <span>{question.length}/1000</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-[52px] shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-4 font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isLoading ? "Enviando..." : "Enviar"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-500">
          As respostas do assistente podem conter imprecisões. Em caso de
          dúvida, consulte o regulamento oficial ou a administração.
        </p>
      </div>
    </section>
  );
}
