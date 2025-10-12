type LahanSummaryCard = {
  id?: string;
  name?: string;
  areaHa?: number | null;
  ndviScore?: number | null;
  ndviStatus?: string | null;
  coordinateCount?: number | null;
  capturedAt?: string | null;
  locationLabel?: string | null;
};

type LahanSummaryTotals = {
  lahanCount?: number;
  totalAreaHa?: number | null;
  averageNdvi?: number | null;
  classificationBreakdown?: Record<string, number>;
  latestDataTimestamp?: string | null;
};

const formatSummaryOutput = (text: string | null | undefined): string => {
  if (!text) {
    return "";
  }

  const normalised = text
    .replace(/\r\n/g, "\n")
    .replace(/[•▪︎●]/g, "-")
    .trim();

  const lines = normalised
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (lines.length === 0) {
    return normalised;
  }

  const formatted = lines.map((line, index) => {
    const body = line.replace(/^[-•\d\.)\s]+/, "").trim();
    return `- Prioritas ${index + 1}: ${body}`;
  });

  return formatted.join("\n");
};

const normaliseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildPrompt = (cards: LahanSummaryCard[], totals: LahanSummaryTotals): string => {
  const lahanCount = totals.lahanCount ?? cards.length;
  const totalArea = totals.totalAreaHa ?? null;
  const averageNdvi = totals.averageNdvi ?? null;
  const distribution = Object.entries(totals.classificationBreakdown ?? {})
    .map(([label, count]) => `${label}: ${count} lahan`)
    .join(", ") || "-";
  const latestDate = totals.latestDataTimestamp
    ? new Date(totals.latestDataTimestamp).toISOString().split("T")[0]
    : "Tidak ada tanggal terbaru";

  const detailLines = cards
    .map((card, index) => {
      const ndvi = card.ndviScore ?? "-";
      const area = card.areaHa ?? "-";
      const status = card.ndviStatus ?? "Belum Ada Status";
      const location = card.locationLabel ? ` | Lokasi: ${card.locationLabel}` : "";
      return `${index + 1}. ${card.name ?? "Lahan Tanpa Nama"} | Status NDVI: ${status} | Nilai NDVI: ${ndvi} | Luas: ${area} ha${location}`;
    })
    .join("\n");

  return `Data ringkasan lahan Matani:
Jumlah lahan: ${lahanCount}
Total luas: ${totalArea ?? "-"} ha
Rata-rata NDVI: ${averageNdvi ?? "-"}
Distribusi status: ${distribution}
Tanggal data terbaru: ${latestDate}

Detail setiap lahan:
${detailLines}

Buat ringkasan maksimal empat poin dengan format "Prioritas X:" (mulai dari Prioritas 1 sebagai tindakan paling mendesak) yang ramah petani, jelaskan kondisi keseluruhan dan rekomendasi tindakan lanjut.`;
};

export async function POST(req: Request) {
  try {
    console.log("Matani AI summary endpoint called");

    const payload = (await req.json()) as {
      lahanCards?: LahanSummaryCard[];
      totals?: LahanSummaryTotals;
      messages?: unknown;
    };
    const { lahanCards, totals, messages } = payload ?? {};

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY not found");
      return Response.json(
        {
          error:
            "Gemini API key not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables.",
        },
        { status: 500 }
      );
    }

    const hasLahanPayload = Array.isArray(lahanCards) && lahanCards.length > 0;

    const normalisedCards: LahanSummaryCard[] = hasLahanPayload
      ? (lahanCards as LahanSummaryCard[]).map((card) => ({
          id: card?.id ?? "",
          name: card?.name ?? "Lahan Tanpa Nama",
          areaHa: normaliseNumber(card?.areaHa ?? null),
          ndviScore: normaliseNumber(card?.ndviScore ?? null),
          ndviStatus: card?.ndviStatus ?? "Belum Ada Status",
          coordinateCount: typeof card?.coordinateCount === "number" ? card.coordinateCount : null,
          capturedAt: card?.capturedAt ?? null,
          locationLabel: card?.locationLabel ?? null,
        }))
      : [];

    const normalisedTotals: LahanSummaryTotals = hasLahanPayload
      ? {
          lahanCount: totals?.lahanCount ?? normalisedCards.length,
          totalAreaHa: normaliseNumber(totals?.totalAreaHa ?? null),
          averageNdvi: normaliseNumber(totals?.averageNdvi ?? null),
          classificationBreakdown: totals?.classificationBreakdown ?? {},
          latestDataTimestamp: totals?.latestDataTimestamp ?? null,
        }
      : {};

    const prompt = hasLahanPayload ? buildPrompt(normalisedCards, normalisedTotals) : undefined;

    const messageStack = prompt
      ? [{ role: "user", content: prompt }]
      : Array.isArray(messages) && messages.length
      ? messages
      : [
          {
            role: "user",
            content:
              "Berikan ringkasan singkat mengenai kondisi lahan Matani. Jika tidak ada data, informasikan bahwa ringkasan belum tersedia.",
          },
        ];



    const requestedModel = process.env.MATANI_GEMINI_MODEL?.trim();
    const modelCandidates = (
      [
        requestedModel,
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-002",
        "gemini-1.5-pro",
        "gemini-pro",
      ] as (string | undefined)[]
    )
      .filter((model): model is string => Boolean(model))
      .map((model) => model.replace(/^models\//i, ""));

  const systemInstruction = `Kamu adalah Asisten Agronomi Matani, spesialis analisis data lahan. Tugasmu adalah memberikan wawasan praktis, akurat, dan mudah diterapkan oleh petani.
Jawab selalu dalam bahasa Indonesia yang ramah.
Berikan ringkasan persis tiga poin yang sudah diurutkan dari prioritas tertinggi ke terendah.
Setiap poin WAJIB diawali dengan "Prioritas X:" dan sertakan alasan singkat serta tindak lanjut konkret.
Masukkan tindakan paling penting pada poin pertama dan dukung dengan tindak lanjut yang relevan berikutnya.
Jangan menyertakan tabel, kode, atau format selain daftar poin.`;


    const generationConfig = {
      temperature: 0.6,
      maxOutputTokens: 600,
    } as const;

    let summaryText = "";
    let lastError: Error | null = null;

    for (const candidate of modelCandidates) {
      const modelName = candidate;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents: messageStack.length
          ? messageStack.map((message) => ({
              role: (message as any).role ?? "user",
              parts: Array.isArray((message as any).parts)
                ? (message as any).parts
                : [{ text: (message as any).content ?? "" }],
            }))
          : [
              {
                role: "user",
                parts: [{ text: buildPrompt(normalisedCards, normalisedTotals) }],
              },
            ],
        generationConfig,
        systemInstruction: {
          role: "system",
          parts: [{ text: systemInstruction }],
        },
      };

      try {
        console.log(`🤖 Requesting Gemini summary using model ${modelName}`);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorPayload = await response.text();
          console.error(`❌ Gemini responded with ${response.status} for model ${modelName}:`, errorPayload);
          lastError = new Error(errorPayload || `Gemini request failed with status ${response.status}`);
          if (response.status === 404 || response.status === 400) {
            continue;
          }
          break;
        }

        const result = (await response.json()) as any;
        const parts = result?.candidates?.flatMap((candidateItem: any) => candidateItem?.content?.parts ?? []) ?? [];
        const text = parts
          .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
          .join(" ")
          .trim();

        if (text) {
          summaryText = text;
          break;
        }

        lastError = new Error("Gemini returned empty response");
      } catch (modelError) {
        console.error(`❌ Gemini request failed for model ${modelName}:`, modelError);
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        continue;
      }
    }

    if (!summaryText) {
      throw lastError ?? new Error("Gemini tidak memberikan ringkasan");
    }

  console.log("Gemini summary generated");
  return Response.json({ summary: formatSummaryOutput(summaryText) });
  } catch (error) {
    console.error("Gemini API Error:", error);
    if ((error as any)?.statusCode === 404) {
      console.error(
        "⚠️ Gemini model not found. Set MATANI_GEMINI_MODEL env var to a supported model ID."
      );
    }
    return Response.json(
      {
        error: "Failed to process request with Gemini",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
