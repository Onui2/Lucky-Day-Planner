import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sajuRouter from "./saju";
import fortuneRouter from "./fortune";
import manseryokRouter from "./manseryok";
import savedSajuRouter from "./savedSaju";
import inquiriesRouter from "./inquiries";
import usersRouter from "./users";
import yearFortuneRouter from "./year-fortune";
import nameRouter from "./name";
import zodiacRouter from "./zodiac";
import accountRouter from "./account";
import dreamRouter from "./dream";
import calendarRouter from "./calendar";
import loveFortuneRouter from "./love-fortune";
import daeunMonthlyRouter from "./daeun-monthly";

const router: IRouter = Router();

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
