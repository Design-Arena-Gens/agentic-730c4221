"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MessageRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  questionId?: string;
};

type Question = {
  id: string;
  title: string;
  prompt: string;
  helper?: string;
  placeholder?: string;
  suggestions?: string[];
  optional?: boolean;
};

const QUESTIONS: Question[] = [
  {
    id: "objective",
    title: "Objetivo",
    prompt:
      "Qual é o objetivo principal do prompt? Explique o que você espera que o assistente faça.",
    helper:
      "Exemplo: criar um roteiro de vídeo de 60 segundos que convença estudantes a estudar no exterior.",
    suggestions: [
      "Escrever uma carta persuasiva",
      "Gerar ideias de conteúdo",
      "Criar um plano de estudo personalizado",
      "Produzir um roteiro detalhado",
    ],
  },
  {
    id: "context",
    title: "Contexto-chave",
    prompt:
      "Quais informações de contexto o assistente precisa saber para trabalhar bem?",
    helper:
      "Inclua dados relevantes, público, limitações de orçamento, restrições técnicas ou qualquer histórico importante.",
    placeholder:
      "O produto é uma plataforma mobile focada em viagens, com orçamento de marketing limitado...",
  },
  {
    id: "audience",
    title: "Público",
    prompt:
      "Quem é o público-alvo ou destinatário final do resultado? Conte características relevantes.",
    helper:
      "Idade, nível de experiência, função, tom preferido, dores e expectativas ajudam a direcionar a resposta.",
    suggestions: [
      "Profissionais de marketing",
      "Equipe executiva",
      "Programadores iniciantes",
      "Estudantes universitários",
    ],
  },
  {
    id: "tone",
    title: "Tom e Estilo",
    prompt:
      "Qual tom, estilo ou voz o assistente deve adotar? Existem referências ou modelos desejados?",
    helper:
      "Pense em palavras-chave como 'didático', 'analítico', 'executivo', 'inspirador' ou em estilos de comunicação específicos.",
    suggestions: [
      "Tom consultivo, com passos claros",
      "Estilo direto e objetivo",
      "Narrativa inspiradora com storytelling",
      "Tom técnico com foco em precisão",
    ],
  },
  {
    id: "constraints",
    title: "Restrições",
    prompt:
      "Quais requisitos, limitações ou entregáveis obrigatórios precisam entrar no prompt?",
    helper:
      "Inclua formatos, estruturas, citações, ferramentas que devem ser consideradas ou limites que não podem ser ultrapassados.",
    placeholder:
      "Usar bullet points, limitar a 500 palavras, incluir referências, citar fontes confiáveis...",
  },
  {
    id: "format",
    title: "Formato da Resposta",
    prompt:
      "Como você quer receber a resposta final? Estrutura, seções, tabela, checklist, passos numerados?",
    helper:
      "Descreva a organização desejada: tópicos, tabela Markdown, JSON, resumo executivo, matriz SWOT etc.",
    suggestions: [
      "Checklist priorizado",
      "Tabela Markdown com colunas personalizadas",
      "Resumo em formato de briefing executivo",
      "Plano em etapas numeradas",
    ],
  },
  {
    id: "additional",
    title: "Detalhes Extras",
    prompt:
      "Existe algum detalhe adicional, referência inspiradora ou resultado anterior que devemos considerar?",
    helper:
      "Cole exemplos úteis, links de referência, preferências pessoais ou materiais que já possua.",
    optional: true,
  },
];

const FOCUS_OPTIONS = [
  "Clareza",
  "Profundidade",
  "Criatividade",
  "Brevidade",
  "Ação imediata",
];

const RESULT_LANGUAGES = [
  "Português",
  "Inglês",
  "Espanhol",
  "Francês",
  "Alemão",
];

const REVIEW_MODES = [
  {
    id: "structured",
    label: "Resumo Estruturado",
    description: "Organiza a resposta em seções nomeadas para fácil leitura.",
  },
  {
    id: "mentor",
    label: "Mentoria",
    description: "Simula um mentor experiente explicando as escolhas e próximos passos.",
  },
  {
    id: "critical",
    label: "Crítico",
    description: "Destaca pontos falhos ou riscos antes de entregar a resposta final.",
  },
];

const generateId = () => Math.random().toString(36).slice(2, 11);

const buildPrompt = (
  responses: Record<string, string>,
  focus: string[],
  language: string,
  reviewMode: (typeof REVIEW_MODES)[number],
) => {
  const sections: string[] = [];

  if (responses.objective) {
    sections.push(`Objetivo Principal:\n${responses.objective.trim()}`);
  }
  if (responses.context) {
    sections.push(`Contexto Relevante:\n${responses.context.trim()}`);
  }
  if (responses.audience) {
    sections.push(`Público-Alvo:\n${responses.audience.trim()}`);
  }
  if (responses.tone) {
    sections.push(`Preferência de Tom/Estilo:\n${responses.tone.trim()}`);
  }
  if (responses.constraints) {
    sections.push(`Restrições e Requisitos:\n${responses.constraints.trim()}`);
  }
  if (responses.format) {
    sections.push(`Formato Esperado da Resposta:\n${responses.format.trim()}`);
  }
  if (responses.additional) {
    sections.push(`Informações Adicionais:\n${responses.additional.trim()}`);
  }

  const focusLine =
    focus.length > 0
      ? `Priorize: ${focus.join(", ")}.`
      : "Priorize equilíbrio entre qualidade, clareza e concisão.";

  const languageInstruction =
    language === "Português"
      ? "Responda em português brasileiro claro."
      : `Produza a resposta em ${language}.`;

  const reviewInstruction =
    reviewMode.id === "structured"
      ? "Antes de responder, estruture a análise em seções com títulos claros."
      : reviewMode.id === "mentor"
        ? "Adote a postura de um mentor experiente, explique brevemente as escolhas e sugira próximos passos práticos."
        : "Atue de forma crítica: destaque riscos, lacunas de informação e valide se as restrições foram atendidas antes de apresentar a solução final.";

  const finalInstructions = [
    focusLine,
    languageInstruction,
    reviewInstruction,
    "Se faltarem dados importantes, formule perguntas específicas antes de finalizar.",
    "Quando entregar o resultado, inclua um breve checklist de validação com os itens atendidos.",
  ];

  return (
    [
      "Você é um assistente estratégico especializado em engenharia de prompts. Utilize as informações abaixo para produzir a melhor solicitação possível para um modelo de linguagem avançado.",
      sections.join("\n\n"),
      finalInstructions.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const intro: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content:
        "Olá! Sou o seu assistente construtor de prompts. Vou fazer algumas perguntas rápidas para entender o que você precisa. Vamos começar?",
    };
    const firstQuestion = QUESTIONS[0];

    const first: ChatMessage = {
      id: generateId(),
      role: "assistant",
      questionId: firstQuestion.id,
      content: firstQuestion.prompt,
    };

    return [intro, first];
  });

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [input, setInput] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [isComplete, setIsComplete] = useState(false);
  const [focus, setFocus] = useState<string[]>(["Clareza", "Profundidade"]);
  const [language, setLanguage] = useState<string>("Português");
  const [reviewMode, setReviewMode] = useState<(typeof REVIEW_MODES)[number]>(
    REVIEW_MODES[0],
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentQuestion = QUESTIONS[currentQuestionIndex];

  const promptPreview = useMemo(
    () => buildPrompt(responses, focus, language, reviewMode),
    [responses, focus, language, reviewMode],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pendingQuestions = useMemo(
    () =>
      QUESTIONS.filter((question) => !responses[question.id] && !question.optional),
    [responses],
  );

  const handleToggleFocus = (value: string) => {
    setFocus((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    if (editingQuestionId) {
      setResponses((prev) => ({
        ...prev,
        [editingQuestionId]: trimmed,
      }));

      setMessages((prev) =>
        prev.map((message) =>
          message.role === "user" && message.questionId === editingQuestionId
            ? { ...message, content: trimmed }
            : message,
        ),
      );

      setInput("");
      setEditingQuestionId(null);
      return;
    }

    const question = currentQuestion;
    if (!question) {
      return;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      questionId: question.id,
      content: trimmed,
    };

    const nextIndex = currentQuestionIndex + 1;
    const hasNext = nextIndex < QUESTIONS.length;

    const updatedMessages: ChatMessage[] = [userMessage];

    if (hasNext) {
      const nextQuestion = QUESTIONS[nextIndex];
      updatedMessages.push({
        id: generateId(),
        role: "assistant",
        questionId: nextQuestion.id,
        content: nextQuestion.prompt,
      });
    } else {
      updatedMessages.push({
        id: generateId(),
        role: "assistant",
        content:
          "Perfeito! Compilei todas as informações. Confira o preview do prompt ao lado e ajuste qualquer detalhe se achar necessário.",
      });
      setIsComplete(true);
    }

    setMessages((prev) => [...prev, ...updatedMessages]);
    setResponses((prev) => ({ ...prev, [question.id]: trimmed }));
    setInput("");
    if (hasNext) {
      setCurrentQuestionIndex(nextIndex);
    }
  };

  const handleEdit = (questionId: string, value: string) => {
    setEditingQuestionId(questionId);
    setInput(value);
    const questionIndex = QUESTIONS.findIndex((q) => q.id === questionId);
    if (questionIndex >= 0) {
      setCurrentQuestionIndex(questionIndex);
      if (!messages.some((msg) => msg.questionId === questionId && msg.role === "assistant")) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            questionId,
            content: QUESTIONS[questionIndex].prompt,
          },
        ]);
      }
    }
  };

  const handleSuggestion = (value: string) => {
    setInput((prev) =>
      prev.length === 0
        ? value
        : prev.includes(value)
          ? prev
          : `${prev.trim()}${prev.trim().endsWith(",") ? "" : " "}${value}`,
    );
  };

  const resetConversation = () => {
    setResponses({});
    setInput("");
    setEditingQuestionId(null);
    setIsComplete(false);
    setCurrentQuestionIndex(0);
    setMessages(() => {
      const intro: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "Recomeçando do zero. Conte novamente o que você precisa e construiremos um novo prompt sob medida.",
      };
      const firstQuestion = QUESTIONS[0];

      return [
        intro,
        {
          id: generateId(),
          role: "assistant",
          questionId: firstQuestion.id,
          content: firstQuestion.prompt,
        },
      ];
    });
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptPreview);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content:
            "Pronto! Prompt copiado para a área de transferência. Se precisar de variações ou ajustes, é só avisar.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content:
            "Não consegui copiar automaticamente. Copie manualmente o conteúdo do painel de preview.",
        },
      ]);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 pb-24 font-sans text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#172554,_transparent_55%),radial-gradient(circle_at_bottom,_#1e293b,_transparent_45%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-32 pt-16 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-slate-200/80">
            Prompt Architect
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            Construa prompts complexos com um assistente que faz as perguntas
            certas antes de criar a solução final.
          </h1>
          <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
            Responda às questões estratégicas, refine cada detalhe e gere um
            prompt poderoso para qualquer modelo de linguagem. Tudo em um fluxo
            guiado, colaborativo e personalizável.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="flex h-[36rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-blue-500/10 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-200">
                  Assistente Interativo
                </p>
                <p className="text-xs text-slate-300/80">
                  Responda às perguntas para refinar seu prompt.
                </p>
              </div>
              <button
                onClick={resetConversation}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-white/20"
              >
                Reiniciar
              </button>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {messages.map((message) => {
                  const questionMeta = QUESTIONS.find(
                    (question) => question.id === message.questionId,
                  );
                  const isQuestion = message.role === "assistant" && questionMeta;
                  return (
                    <div
                      key={message.id}
                      className={`flex w-full ${
                        message.role === "assistant"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-full rounded-3xl border px-5 py-4 text-sm shadow-md transition ${
                          message.role === "assistant"
                            ? "border-slate-700/60 bg-slate-900/80 text-slate-100"
                            : "border-sky-400/40 bg-sky-500/20 text-sky-100"
                        }`}
                      >
                        {isQuestion && questionMeta.helper ? (
                          <div className="mb-3 text-xs text-slate-300/80">
                            {questionMeta.helper}
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {isQuestion && questionMeta.suggestions?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {questionMeta.suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleSuggestion(suggestion)}
                                className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-400/60 hover:text-white"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                className="border-t border-white/10 bg-slate-900/60 px-6 py-4"
              >
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">
                  {editingQuestionId
                    ? "Editando resposta anterior"
                    : currentQuestion
                      ? `Sua resposta sobre ${currentQuestion.title}`
                      : "Adicione notas ou instruções adicionais"}
                </label>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    currentQuestion?.placeholder ??
                    "Descreva com o máximo de clareza o que deseja receber."
                  }
                  className="h-24 w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300/90">
                    {pendingQuestions.length > 0 ? (
                      <>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">
                          {pendingQuestions.length}
                        </span>
                        <span>
                          perguntas pendentes para concluir o prompt perfeito.
                        </span>
                      </>
                    ) : (
                      <span>
                        Todas as respostas essenciais foram coletadas. Ajuste se
                        desejar!
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    {editingQuestionId
                      ? "Salvar ajustes"
                      : isComplete
                        ? "Adicionar observação"
                        : "Enviar resposta"}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-blue-500/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Painel de Diretrizes
                </h2>
                <span className="text-xs uppercase tracking-widest text-slate-200/70">
                  Personalize
                </span>
              </div>

              <div className="mt-6 space-y-6 text-sm text-slate-200/90">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest">
                    Foco Estratégico
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_OPTIONS.map((option) => {
                      const active = focus.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleToggleFocus(option)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            active
                              ? "border-sky-400 bg-sky-500/20 text-sky-100"
                              : "border-white/20 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:text-white"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                      Idioma final
                    </span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    >
                      {RESULT_LANGUAGES.map((lang) => (
                        <option
                          key={lang}
                          value={lang}
                          className="bg-slate-900 text-slate-50"
                        >
                          {lang}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-200/80">
                      Revisão da resposta
                    </span>
                    <select
                      value={reviewMode.id}
                      onChange={(event) =>
                        setReviewMode(
                          REVIEW_MODES.find(
                            (mode) => mode.id === event.target.value,
                          ) ?? REVIEW_MODES[0],
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    >
                      {REVIEW_MODES.map((mode) => (
                        <option
                          key={mode.id}
                          value={mode.id}
                          className="bg-slate-900 text-slate-50"
                        >
                          {mode.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-300/80">
                      {reviewMode.description}
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-blue-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Preview do Prompt
                  </h2>
                  <p className="text-xs text-slate-300/80">
                    A versão pronta para copiar é atualizada em tempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-sky-100 transition hover:bg-sky-500/20"
                >
                  Copiar Prompt
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-100">
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-slate-100">
                  {promptPreview}
                </pre>
              </div>

              <div className="space-y-3 text-xs text-slate-300/80">
                <div>
                  <p className="mb-2 font-semibold uppercase tracking-widest text-slate-200/80">
                    Respostas coletadas
                  </p>
                  <ul className="space-y-2">
                    {QUESTIONS.map((question) => {
                      const answer = responses[question.id];
                      return (
                        <li
                          key={question.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-slate-100">
                              {question.title}
                              {question.optional ? " (Opcional)" : ""}
                            </p>
                            <p className="mt-1 text-slate-300/90">
                              {answer ? (
                                <span className="whitespace-pre-wrap">
                                  {answer}
                                </span>
                              ) : (
                                <span className="italic text-slate-400">
                                  Não respondido ainda.
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(question.id, answer ?? "")
                            }
                            className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-200 transition hover:border-sky-400/60 hover:text-white"
                          >
                            {answer ? "Editar" : "Responder"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {pendingQuestions.length > 0 ? (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-medium uppercase tracking-widest text-amber-200/90">
                    Ainda restam {pendingQuestions.length} perguntas essenciais. Responda para liberar o prompt completo.
                  </p>
                ) : (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] font-medium uppercase tracking-widest text-emerald-200/90">
                    Tudo pronto! Ajuste o preview, copie e utilize com confiança.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
