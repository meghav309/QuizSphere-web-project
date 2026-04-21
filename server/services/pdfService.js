const PDFDocument = require("pdfkit")
const { decrypt } = require("../utils/crypto")

const COLORS = {
  primary: "#4F46E5",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  light: "#F3F4F6",
  text: "#111827",
  muted: "#6B7280",
  white: "#FFFFFF",
}

const FONTS = {
  normal: "Helvetica",
  bold: "Helvetica-Bold",
}

const PAGE_MARGIN = 50

const decryptAnswer = (q) => {
  try {
    return decrypt(q.answerEncrypted, q.answerIV, q.answerAuthTag)
  } catch {
    return "?"
  }
}

const formatDate = (d = new Date()) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

const drawRule = (doc, y, color = COLORS.primary, thickness = 1) => {
  doc.moveTo(PAGE_MARGIN, y)
    .lineTo(doc.page.width - PAGE_MARGIN, y)
    .lineWidth(thickness)
    .strokeColor(color)
    .stroke()
}

const statRow = (doc, label, value, y, labelColor = COLORS.muted, valueColor = COLORS.text) => {
  doc.fontSize(11).font(FONTS.bold).fillColor(labelColor).text(label, PAGE_MARGIN, y, { continued: true })
  doc.font(FONTS.normal).fillColor(valueColor).text(`  ${value}`)
  return doc.y + 4
}

const generateReport = (attempt, questions, username = "Student") => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" })
    const chunks = []

    doc.on("data", (chunk) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    // Build lookup maps — match by either _id or questionUUID
    const mapByUUID = new Map(questions.map((q) => [q.questionUUID, q]))
    const mapById = new Map(questions.map((q) => [q._id.toString(), q]))

    const lookupQuestion = (id) => mapByUUID.get(id) || mapById.get(id)

    const total = attempt.questionIds.length
    const skipped = total - attempt.correctCount - attempt.wrongCount
    const percentage = total > 0 ? ((attempt.score / total) * 100).toFixed(1) : "0.0"

    // ── HEADER ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 110).fill(COLORS.primary)

    doc.font(FONTS.bold).fontSize(26).fillColor(COLORS.white)
      .text("QuizSphere", PAGE_MARGIN, 28)

    doc.font(FONTS.normal).fontSize(12).fillColor("#C7D2FE")
      .text("Quiz Performance Report", PAGE_MARGIN, 60)

    doc.fontSize(10).fillColor("#E0E7FF")
      .text(
        `${username}  ·  ${formatDate()}  ·  ${attempt.categorySlug}  ·  ${attempt.difficulty}`,
        PAGE_MARGIN, 80
      )

    // ── SCORE SUMMARY ─────────────────────────────────────────────────────────
    const boxTop = 130
    doc.roundedRect(PAGE_MARGIN, boxTop, doc.page.width - PAGE_MARGIN * 2, 130, 8)
      .fill(COLORS.light)

    doc.font(FONTS.bold).fontSize(13).fillColor(COLORS.primary)
      .text("Score Summary", PAGE_MARGIN + 16, boxTop + 14)

    drawRule(doc, boxTop + 32, "#D1D5DB", 0.5)

    let y = boxTop + 42
    y = statRow(doc, "Total Score:", `${attempt.score.toFixed(2)} / ${total}  (${percentage}%)`, y, COLORS.muted, COLORS.primary)
    y = statRow(doc, "Correct:", `${attempt.correctCount}`, y, COLORS.muted, COLORS.success)
    y = statRow(doc, "Wrong:", `${attempt.wrongCount}`, y, COLORS.muted, COLORS.danger)
    y = statRow(doc, "Skipped:", `${skipped}`, y, COLORS.muted, COLORS.warning)
    statRow(doc, "Recommendation:", attempt.recommendation, y, COLORS.muted, COLORS.text)

    // ── QUESTION BREAKDOWN ────────────────────────────────────────────────────
    const breakdownY = boxTop + 150
    doc.font(FONTS.bold).fontSize(14).fillColor(COLORS.text)
      .text("Question Breakdown", PAGE_MARGIN, breakdownY)

    drawRule(doc, breakdownY + 18, COLORS.primary, 1.5)

    doc.y = breakdownY + 28

    attempt.responses.forEach((response, idx) => {
      // Use the fixed lookup function
      const question = lookupQuestion(response.questionId)
      const correctAnswer = question ? decryptAnswer(question) : "?"
      const selected = response.selected
      const isCorrect = selected === correctAnswer
      const isSkipped = !selected

      const accentColor = isSkipped ? COLORS.warning : isCorrect ? COLORS.success : COLORS.danger
      const statusLabel = isSkipped ? "Skipped" : isCorrect ? "Correct" : "Wrong"

      const cardTop = doc.y
      const cardWidth = doc.page.width - PAGE_MARGIN * 2
      const cardPadding = 12

      doc.rect(PAGE_MARGIN, cardTop, cardWidth, 2).fill(accentColor)
      doc.y = cardTop + 8

      // Question number and status
      doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.text)
        .text(
          `Q${idx + 1}.  ${statusLabel}`,
          PAGE_MARGIN + cardPadding,
          doc.y
        )

      // Question text
      doc.font(FONTS.bold).fontSize(11).fillColor(COLORS.text)
        .text(
          question?.questionText ?? "Question text unavailable",
          PAGE_MARGIN + cardPadding,
          doc.y + 4,
          { width: cardWidth - cardPadding * 2 }
        )

      doc.y += 6

        // Options
        ; (question?.options ?? []).forEach((opt) => {
          const isThisCorrect = opt.key === correctAnswer
          const isThisSelected = opt.key === selected

          let optColor = COLORS.text
          let prefix = `  ${opt.key}.  `

          if (isThisCorrect) { optColor = COLORS.success; prefix = `+ ${opt.key}.  ` }
          if (isThisSelected && !isThisCorrect) { optColor = COLORS.danger; prefix = `x ${opt.key}.  ` }

          doc.font(isThisCorrect || isThisSelected ? FONTS.bold : FONTS.normal)
            .fontSize(10).fillColor(optColor)
            .text(
              `${prefix}${opt.text}`,
              PAGE_MARGIN + cardPadding + 8,
              doc.y,
              { width: cardWidth - cardPadding * 2 - 8 }
            )
        })

      doc.y += 4

      // Answer row
      doc.font(FONTS.normal).fontSize(9.5).fillColor(COLORS.muted)
        .text(
          `Your answer: ${selected ?? "—"}   |   Correct answer: ${correctAnswer}`,
          PAGE_MARGIN + cardPadding,
          doc.y
        )

      // Explanation
      if (question?.explanation) {
        doc.y += 4
        doc.font(FONTS.normal).fontSize(9).fillColor(COLORS.muted)
          .text(
            `Explanation: ${question.explanation}`,
            PAGE_MARGIN + cardPadding,
            doc.y,
            { width: cardWidth - cardPadding * 2 }
          )
      }

      doc.y += 14
      drawRule(doc, doc.y, "#E5E7EB", 0.5)
      doc.y += 10

      if (doc.y > doc.page.height - 100) {
        doc.addPage()
        doc.y = PAGE_MARGIN
      }
    })

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.font(FONTS.normal).fontSize(9).fillColor(COLORS.muted)
      .text(
        `Generated by QuizSphere  ·  Attempt ID: ${attempt.attemptId}`,
        PAGE_MARGIN,
        doc.page.height - 40,
        { align: "center", width: doc.page.width - PAGE_MARGIN * 2 }
      )

    doc.end()
  })
}

module.exports = { generateReport }