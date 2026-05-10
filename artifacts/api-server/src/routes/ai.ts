import { Router, type Request, type Response } from "express";
import { aiQuestionsTable, db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { buildSajuQuestionAnswer } from "../lib/ai-assistant.js";
import {
  getActiveSubscription,
  getMonthlyBucket,
  getMonthlyQuestionUsage,
  getPlanQuestionLimit,
  parseBirthInfo,
} from "../lib/commerce.js";
import { requireDatabase } from "../lib/database-guard.js";
import { isPrivilegedRole } from "../lib/date-access.js";
import { buildSajuResult } from "../lib/saju-result.js";

const router = Router();

function requireAuth(req: Request, res: Response): req is Request & { user: Express.User } {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }

  return true;
}

async function getUsageSummary(userId: string, role?: string | null) {
  const subscription = await getActiveSubscription(userId);
  const planCode = subscription?.planCode ?? null;
  const unlimited = isPrivilegedRole(role);
  const limit = unlimited ? 0 : getPlanQuestionLimit(planCode);
  const monthlyBucket = getMonthlyBucket();
  const used = await getMonthlyQuestionUsage(userId, monthlyBucket);
  const remaining = unlimited ? 0 : Math.max(0, limit - used);

  return {
    planCode,
    limit: unlimited ? null : limit,
    used,
    remaining: unlimited ? null : remaining,
    monthlyBucket,
    unlimited,
  };
}

router.get("/ai/questions", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  try {
    const usage = await getUsageSummary(req.user.id, req.user.role);
    const questions = await db
      .select({
        id: aiQuestionsTable.id,
        question: aiQuestionsTable.question,
        answer: aiQuestionsTable.answer,
        createdAt: aiQuestionsTable.createdAt,
      })
      .from(aiQuestionsTable)
      .where(eq(aiQuestionsTable.userId, req.user.id))
      .orderBy(desc(aiQuestionsTable.createdAt))
      .limit(20);

    res.json({
      ...usage,
      questions,
    });
  } catch (error) {
    console.error("ai question list error:", error);
    res.status(500).json({ error: "질문 기록을 불러오지 못했습니다." });
  }
});

router.post("/ai/questions", async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (!(await requireDatabase(res))) return;

  const body = req.body as Record<string, unknown>;
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const birthInfo = parseBirthInfo(body.birthInfo);

  if (!question) {
    res.status(400).json({ error: "질문을 입력해주세요." });
    return;
  }

  if (!birthInfo) {
    res.status(400).json({ error: "질문할 사주 정보가 필요합니다." });
    return;
  }

  try {
    const usage = await getUsageSummary(req.user.id, req.user.role);
    if (!usage.unlimited && usage.limit !== null && usage.used >= usage.limit) {
      res.status(403).json({
        error: "이번 달 질문 가능 횟수를 모두 사용했습니다.",
        ...usage,
      });
      return;
    }

    const sajuResult = buildSajuResult({
      birthYear: birthInfo.year,
      birthMonth: birthInfo.month,
      birthDay: birthInfo.day,
      birthHour: birthInfo.hour,
      birthMinute: birthInfo.minute ?? 0,
      gender: birthInfo.gender,
      calendarType: birthInfo.calendarType,
    });
    const answer = await buildSajuQuestionAnswer(
      question,
      sajuResult as Record<string, any>,
    );

    const [saved] = await db
      .insert(aiQuestionsTable)
      .values({
        userId: req.user.id,
        subscriptionPlanCode: usage.planCode,
        monthlyBucket: usage.monthlyBucket,
        question,
        answer,
        birthInfo,
        sajuResult,
      })
      .returning();

    res.json({
      question: saved,
      limit: usage.limit,
      used: usage.used + 1,
      remaining: usage.unlimited ? 0 : Math.max(0, usage.limit - usage.used - 1),
      planCode: usage.planCode,
      unlimited: usage.unlimited,
    });
  } catch (error) {
    console.error("ai question create error:", error);
    res.status(500).json({ error: "AI 질문 답변 생성에 실패했습니다." });
  }
});

export default router;
