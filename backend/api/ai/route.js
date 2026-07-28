import express from "express";
const router = express.Router();

const formatSummaryOutput = (text) => {
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
    .slice(0, 3);

  if (lines.length === 0) {
    return normalised;
  }

  const formatted = lines.map((line, index) => {
    const body = line.replace(/^[-•\d\.)\s]+/, "").trim();
    return `${body}`;
  });

  return formatted.join("\n\n");
};

const normaliseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildLahanSummaryPrompt = (cards, totals) => {
  const lines = cards
    .map((card, index) => {
      const ndvi = card.ndviScore === null || card.ndviScore === undefined ? "-" : card.ndviScore;
      const ndmi = card.ndmiScore === null || card.ndmiScore === undefined ? "-" : card.ndmiScore;
      const area = card.areaHa === null || card.areaHa === undefined ? "-" : card.areaHa;
      const location = card.locationLabel ? ` | Lokasi: ${card.locationLabel}` : "";
      return `${index + 1}. ${card.name} | Status data: ${card.dataState} | Interpretasi NDVI: ${card.ndviStatus} | Nilai NDVI: ${ndvi} | Nilai NDMI: ${ndmi} | Luas: ${area} ha | Titik: ${card.coordinateCount}${location}`;
    })
    .join("\n");

  const distributionEntries = Object.entries(totals.classificationBreakdown || {}).map(
    ([label, count]) => `${label}: ${count} lahan`
  );

  const recencyLabel = totals.latestDataTimestamp
    ? new Date(totals.latestDataTimestamp).toISOString().split("T")[0]
    : "Tidak ada timestamp input";

  return `Data ringkasan lahan Matani:
Jumlah lahan: ${totals.lahanCount}
Total luas: ${totals.totalAreaHa ?? "-"} ha
Rata-rata nilai NDVI input: ${totals.averageNdvi ?? "-"}
Distribusi status: ${distributionEntries.join(", ") || "-"}
Timestamp input terbaru (bukan otomatis tanggal akuisisi satelit): ${recencyLabel}

Detail setiap lahan:
${lines}

Buat ringkasan maksimal 3 poin dengan format "Prioritas X:" (mulai dari Prioritas 1 sebagai tindakan paling mendesak) untuk menjelaskan input yang tersedia dan saran verifikasi lapangan. Gunakan bahasa Indonesia yang ramah petani.`;
};

router.post("/summary", async (req, res) => {
  try {
    if (process.env.AI_SUMMARY_ENABLED !== "true") {
      return res.status(503).json({ error: "ai_summary_disabled" });
    }
    const { lahanCards, totals } = req.body ?? {};

    if (!Array.isArray(lahanCards)) {
      return res.status(400).json({ error: "lahanCards harus berupa array" });
    }

    if (!lahanCards.length) {
      return res.json({ summary: "Belum ada data lahan tersimpan untuk dirangkum." });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          "Gemini API key not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to environment variables.",
      });
    }

    const normalisedCards = lahanCards.map((card) => ({
      id: card?.id ?? "",
      name: card?.name ?? "Lahan Tanpa Nama",
      areaHa: normaliseNumber(card?.areaHa),
      ndviScore: normaliseNumber(card?.ndviScore),
      ndmiScore: normaliseNumber(card?.ndmiScore),
      ndviStatus: card?.ndviStatus ?? "Belum Ada Status",
      dataState: ["fixture", "prototype", "measured", "unavailable"].includes(
        card?.dataState
      )
        ? card.dataState
        : "unavailable",
      coordinateCount: Number.isFinite(card?.coordinateCount) ? card.coordinateCount : null,
      capturedAt: card?.capturedAt ?? null,
      locationLabel: card?.locationLabel ?? null,
    }));

    const computedTotals = {
      lahanCount: totals?.lahanCount ?? normalisedCards.length,
      totalAreaHa: normaliseNumber(totals?.totalAreaHa),
      averageNdvi: normaliseNumber(totals?.averageNdvi),
      classificationBreakdown: totals?.classificationBreakdown ?? {},
      latestDataTimestamp: totals?.latestDataTimestamp ?? null,
    };

    const userPrompt = buildLahanSummaryPrompt(normalisedCards, computedTotals);

    const requestedModel = process.env.MATANI_GEMINI_MODEL?.trim();
    const modelCandidates = [
      requestedModel,
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro",
      "gemini-pro",
    ]
      .filter(Boolean)
      .map((model) => model.replace(/^models\//i, ""));

  const systemInstruction = `Kamu adalah layanan ringkasan informasi prototipe Matani. Tugasmu adalah merangkum input yang diberikan tanpa mengubah fixture atau data prototipe menjadi pengukuran, diagnosis, atau ground truth.
Jawab selalu dalam bahasa Indonesia yang ramah.
Berikan ringkasan dalam persis 3 poin yang sudah diurutkan dari prioritas tertinggi ke terendah.
Setiap poin WAJIB diawali dengan "Prioritas X:" (contoh: "Prioritas 1:") dan jelaskan alasan singkat serta tindak lanjut yang disarankan.
Masukkan langkah yang paling berdampak di poin pertama, kemudian dukung dengan tindak lanjut penting lainnya.
Jangan menyertakan kode, tabel, atau format selain daftar poin.
**perhatian**:
- Sebutkan secara jelas jika input berstatus fixture, prototype, atau unavailable.
- Jangan menyebut fixture/prototype sebagai pengukuran satelit atau observasi lapangan.
- Jangan mendiagnosis hama, penyakit, stres, hasil panen, atau kondisi agronomis.
- Jangan memberi instruksi aplikasi pestisida, fungisida, atau pupuk; arahkan pengguna untuk verifikasi lapangan dan konsultasi ahli.
- minimal 3-4 kalimat pada device mobile!.
- singkat & jelas.
- pastikan jawaban tiap prioritas singkat dan sangat memberikan rekomendasi bagi para petani maupun pemilik lahan
- Jangan gunakan format selain "Prioritas X:" untuk setiap poin.
- tidak usah menggunakan kata pengantar/pembuka pembahasan seperti "tentu saja, mari kita bedah data lahan agar lebih mudah dipahami dan ditindaklanjuti", dll.
- Jangan buat lebih dari atau kurang dari 3 poin.
- Jangan gunakan emoji.
- Gunakan bahasa Indonesia yang ramah petani.
- Hindari istilah teknis yang rumit.
Berikut adalah data ringkasan lahan yang perlu kamu analisis:
${userPrompt}`;



    const generationConfig = {
      temperature: 0.6,
      maxOutputTokens: 600,
    };

    let summaryText = "";
    let lastError = null;

    for (const candidate of modelCandidates) {
      const modelName = candidate;
      const baseUrl =
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta";
      const endpoint = `${baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
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

        const result = await response.json();
        const parts = result?.candidates?.flatMap((candidateItem) => candidateItem?.content?.parts ?? []) ?? [];
        const text = parts
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .join(" ")
          .trim();

        if (text) {
          summaryText = text;
          break;
        }

        lastError = new Error("Gemini returned empty response");
      } catch (modelError) {
        console.error(`❌ Gemini request failed for model ${modelName}:`, modelError);
        lastError = modelError;
        continue;
      }
    }

    if (!summaryText) {
      throw lastError ?? new Error("Gemini tidak memberikan ringkasan");
    }

    const formattedSummary = formatSummaryOutput(summaryText);
    res.json({ summary: formattedSummary });
  } catch (error) {
    console.error("❌ Gemini summary error:", error);
    res.status(500).json({ error: "ai_provider_unavailable" });
  }
});

export default router;
