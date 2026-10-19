import { useEffect } from "react";
import { useYearFortune, type MonetizationBirthInfo } from "@workspace/api-client-react";

const TARGET_YEAR = 2027;

// Free 2027 teaser for the campaign variant. Uses the same year-fortune engine as the
// paid report; the 1~12월 table stays in the paid report.
export function NewYearFreeSummary({ birthInfo }: { birthInfo: MonetizationBirthInfo }) {
  const fortune = useYearFortune();
  const hourKnown = birthInfo.hour >= 0;
  const requestKey = JSON.stringify(birthInfo);

  const run = () => fortune.mutate({
    birthYear: birthInfo.year, birthMonth: birthInfo.month, birthDay: birthInfo.day,
    birthHour: birthInfo.hour, birthMinute: birthInfo.minute ?? 0,
    calendarType: birthInfo.calendarType, isLeapMonth: birthInfo.isLeapMonth,
    birthPlace: birthInfo.birthPlace, timeZone: birthInfo.timeZone,
    longitude: birthInfo.longitude, latitude: birthInfo.latitude,
    applyTrueSolarTime: birthInfo.applyTrueSolarTime, dayBoundary: birthInfo.dayBoundary,
    targetYear: TARGET_YEAR,
  });
  useEffect(() => {
    if (hourKnown) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, hourKnown]);

  const data = fortune.data?.targetYear === TARGET_YEAR ? fortune.data : undefined;
  return <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-7" aria-labelledby="new-year-free-title">
    <p className="text-xs font-medium text-muted-foreground">무료 · 2027년 요약</p>
    <h2 id="new-year-free-title" className="mt-2 font-serif text-2xl">
      {data ? `2027 ${data.yearGanzi}년, 나의 한 해 흐름` : "2027년, 나의 한 해 흐름"}
    </h2>
    {!hourKnown && <p className="mt-3 text-sm leading-6 text-muted-foreground">2027년 요약은 출생시간을 입력해야 계산합니다. 출생시간을 넣어 다시 입력해 주세요.</p>}
    {hourKnown && fortune.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">2027년 흐름을 계산하고 있습니다.</p>}
    {hourKnown && fortune.isError && <p role="alert" className="mt-3 text-sm">2027년 요약을 불러오지 못했습니다. <button type="button" className="underline" onClick={run}>다시 시도</button></p>}
    {data && <>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-sm text-muted-foreground">종합 참고 점수 <strong className="ml-1 text-2xl font-semibold tabular-nums text-foreground">{data.overallScore}</strong></p>
        {data.yearStemMeaning.keyword && <p className="text-sm text-muted-foreground">올해 키워드 · {data.yearStemMeaning.keyword}</p>}
      </div>
      <p className="mt-3 max-w-3xl font-serif text-lg leading-relaxed">{data.overallText}</p>
      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="분기별 참고 점수">
        {data.quarters.map((quarter) => <div key={quarter.name} className="rounded-xl bg-background/70 px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{quarter.name}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{quarter.score}</dd>
        </div>)}
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">참고 점수는 사주 원국과 2027년 세운의 오행 관계로 계산한 값이며, 좋고 나쁨을 단정하지 않습니다. 연간 세운은 입춘 기준입니다. 관계·직업·재물 풀이와 양력 1~12월 요약표는 9,900원 리포트에 포함됩니다.</p>
    </>}
  </section>;
}
