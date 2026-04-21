import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import sajuRouter from "./saju.js";
import fortuneRouter from "./fortune.js";
import manseryokRouter from "./manseryok.js";
import savedSajuRouter from "./savedSaju.js";
import inquiriesRouter from "./inquiries.js";
import usersRouter from "./users.js";
import yearFortuneRouter from "./year-fortune.js";
import nameRouter from "./name.js";
import zodiacRouter from "./zodiac.js";
import accountRouter from "./account.js";
import dreamRouter from "./dream.js";
import calendarRouter from "./calendar.js";
import loveFortuneRouter from "./love-fortune.js";
import daeunMonthlyRouter from "./daeun-monthly.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sajuRouter);
router.use(fortuneRouter);
router.use(manseryokRouter);
router.use(savedSajuRouter);
router.use(inquiriesRouter);
router.use(usersRouter);
router.use(yearFortuneRouter);
router.use(nameRouter);
router.use(zodiacRouter);
router.use(accountRouter);
router.use(dreamRouter);
router.use(calendarRouter);
router.use(loveFortuneRouter);
router.use(daeunMonthlyRouter);

export default router;
