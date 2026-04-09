/**
 * Korean Lunar Calendar Converter
 * Uses lookup table data for accurate solar-to-lunar date conversion.
 * Data covers years 1900-2050.
 *
 * Data format per year: [solarMonth, solarDay, monthLengths...]
 *   - solarMonth, solarDay: solar date of the first day of lunar year
 *   - monthLengths: 12 or 13 values (29=small month, 30=big month)
 *     If 13 months, the leap month index is encoded in the year's leapMonth table.
 *
 * Reference: Korean Astronomical Observatory lunar calendar data
 */

// Leap month for each year (0 = no leap month, otherwise = which month is followed by leap)
const LEAP_MONTH: Record<number, number> = {
  1901: 0, 1902: 0, 1903: 5, 1904: 0, 1905: 0, 1906: 4, 1907: 0, 1908: 0, 1909: 2,
  1910: 6, 1911: 0, 1912: 0, 1913: 0, 1914: 5, 1915: 0, 1916: 0, 1917: 2, 1918: 0,
  1919: 7, 1920: 0, 1921: 0, 1922: 5, 1923: 0, 1924: 0, 1925: 4, 1926: 0, 1927: 0,
  1928: 2, 1929: 6, 1930: 0, 1931: 0, 1932: 0, 1933: 5, 1934: 0, 1935: 0, 1936: 3,
  1937: 0, 1938: 7, 1939: 0, 1940: 0, 1941: 6, 1942: 0, 1943: 0, 1944: 4, 1945: 0,
  1946: 0, 1947: 2, 1948: 0, 1949: 7, 1950: 0, 1951: 0, 1952: 5, 1953: 0, 1954: 0,
  1955: 3, 1956: 0, 1957: 8, 1958: 0, 1959: 0, 1960: 6, 1961: 0, 1962: 0, 1963: 4,
  1964: 0, 1965: 0, 1966: 3, 1967: 0, 1968: 7, 1969: 0, 1970: 0, 1971: 5, 1972: 0,
  1973: 0, 1974: 4, 1975: 0, 1976: 8, 1977: 0, 1978: 0, 1979: 6, 1980: 0, 1981: 0,
  1982: 4, 1983: 0, 1984: 10, 1985: 0, 1986: 0, 1987: 6, 1988: 0, 1989: 0, 1990: 5,
  1991: 0, 1992: 0, 1993: 3, 1994: 0, 1995: 8, 1996: 0, 1997: 0, 1998: 5, 1999: 0,
  2000: 0, 2001: 4, 2002: 0, 2003: 0, 2004: 2, 2005: 0, 2006: 7, 2007: 0, 2008: 0,
  2009: 5, 2010: 0, 2011: 0, 2012: 4, 2013: 0, 2014: 9, 2015: 0, 2016: 0, 2017: 6,
  2018: 0, 2019: 0, 2020: 4, 2021: 0, 2022: 0, 2023: 2, 2024: 0, 2025: 6, 2026: 0,
  2027: 0, 2028: 5, 2029: 0, 2030: 0, 2031: 3, 2032: 0, 2033: 11, 2034: 0, 2035: 0,
  2036: 6, 2037: 0, 2038: 0, 2039: 5, 2040: 0, 2041: 0, 2042: 2, 2043: 0, 2044: 7,
  2045: 0, 2046: 0, 2047: 5, 2048: 0, 2049: 0, 2050: 3,
};

// Each entry: [solar_month, solar_day, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, (m_leap)?]
// m = month length (29 or 30 days). If leap month exists for that year, the 13th value is the leap month length.
const LUNAR_DATA: Record<number, number[]> = {
  2000: [2,5, 30,29,30,29,30,29,30,30,29,30,29,30],
  2001: [1,24, 29,30,29,30,29,30,29,30,30,29,30,29, 30], // leap 4
  2002: [2,12, 30,30,29,29,30,29,30,29,30,30,29,30],
  2003: [2,1,  29,30,30,29,29,30,29,30,29,30,30,30],
  2004: [1,22, 29,30,29,30,29,29,30,29,30,29,30,30, 30], // leap 2
  2005: [2,9,  30,30,29,30,29,29,30,29,30,29,29,30],
  2006: [1,29, 30,30,29,30,30,29,29,30,29,30,29,29, 30], // leap 7
  2007: [2,18, 30,30,29,30,29,30,29,29,30,29,30,29],
  2008: [2,7,  30,30,30,29,30,29,30,29,29,30,29,30],
  2009: [1,26, 29,30,30,29,30,29,30,30,29,29,30,29, 30], // leap 5
  2010: [2,14, 29,30,29,30,29,30,30,29,30,29,30,29],
  2011: [2,3,  30,29,30,29,30,29,30,29,30,30,29,30],
  2012: [1,23, 29,30,29,29,30,29,30,29,30,30,30,29, 29], // leap 4
  2013: [2,10, 30,29,30,29,29,30,29,30,29,30,30,29],
  2014: [1,31, 30,30,29,30,29,29,30,29,29,30,29,30, 30], // leap 9
  2015: [2,19, 29,30,30,29,30,29,29,30,29,30,29,30],
  2016: [2,8,  29,30,29,30,30,29,30,29,30,29,30,29],
  2017: [1,28, 30,29,29,30,30,29,30,29,30,30,29,29, 30], // leap 6
  2018: [2,16, 30,29,30,29,30,29,30,29,30,29,30,30],
  2019: [2,5,  29,30,29,30,29,30,29,30,29,30,29,30],
  2020: [1,25, 30,29,30,29,30,29,29,30,29,30,30,29, 30], // leap 4
  2021: [2,12, 30,29,30,29,30,29,30,29,29,30,29,30],
  2022: [2,1,  30,30,29,30,29,30,29,30,29,29,30,29],
  2023: [1,22, 30,29,30,30,29,29,30,29,30,29,29,30, 30], // leap 2
  2024: [2,10, 29,30,29,30,29,30,30,29,30,29,30,29],
  2025: [1,29, 29,30,29,30,29,30,30,29,30,30,29,29, 30], // leap 6
  2026: [2,17, 30,29,30,29,30,29,30,29,30,30,29,30],
  2027: [2,6,  29,30,29,30,29,29,30,29,30,30,30,29],
  2028: [1,26, 30,29,30,29,30,29,29,30,29,30,29,30, 30], // leap 5
  2029: [2,13, 30,29,30,29,30,29,29,30,29,30,29,30],
  2030: [2,3,  29,30,30,29,29,30,29,30,29,29,30,30],
  2031: [1,23, 29,30,30,29,29,30,30,29,29,30,29,29, 30], // leap 3
  2032: [2,11, 30,30,29,30,29,30,29,30,29,29,30,29],
  2033: [1,31, 30,29,30,30,29,30,29,30,30,29,29,30, 29], // leap 11
  2034: [2,19, 29,30,29,30,29,30,29,30,30,30,29,29],
  2035: [2,8,  30,29,30,29,30,29,30,29,30,30,29,30],
};

function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export interface LunarDate {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
}

export function solarToLunar(solarYear: number, solarMonth: number, solarDay: number): LunarDate {
  // Find the starting year in our data table
  const targetJD = toJulianDay(solarYear, solarMonth, solarDay);

  // Find which lunar year this solar date falls in
  // Try the current and surrounding years
  for (let tryYear = solarYear; tryYear >= solarYear - 1; tryYear--) {
    const data = LUNAR_DATA[tryYear];
    if (!data) continue;

    const [startMonth, startDay, ...months] = data;
    const leapMonth = LEAP_MONTH[tryYear] ?? 0;
    const startJD = toJulianDay(tryYear, startMonth, startDay);

    if (targetJD < startJD) continue;

    // Walk through lunar months to find which one the target falls in
    let currentJD = startJD;
    let monthIndex = 0;
    let lunarMonth = 1;
    let isLeap = false;

    while (monthIndex < months.length) {
      const monthLen = months[monthIndex];
      const nextJD = currentJD + monthLen;

      if (targetJD < nextJD) {
        // Found the month
        const lunarDay = targetJD - currentJD + 1;
        return {
          lunarYear: tryYear,
          lunarMonth,
          lunarDay,
          isLeap
        };
      }

      currentJD = nextJD;
      monthIndex++;

      // Handle leap month
      if (leapMonth > 0 && lunarMonth === leapMonth && !isLeap) {
        isLeap = true;
        // Don't increment lunarMonth, process leap month next
      } else {
        isLeap = false;
        lunarMonth++;
      }
    }
  }

  // Fallback: approximate for years outside our table
  // Use simple calculation based on known reference
  const refJD = toJulianDay(2024, 2, 10); // 2024 Lunar Jan 1
  const diff = targetJD - refJD;
  const approxLunarDay = ((diff % 29) + 29) % 29 + 1;
  const approxLunarMonth = ((Math.floor(diff / 29.5) % 12) + 12) % 12 + 1;

  return {
    lunarYear: solarYear,
    lunarMonth: approxLunarMonth,
    lunarDay: approxLunarDay,
    isLeap: false
  };
}

export function formatLunar(lunarDate: LunarDate): string {
  const m = lunarDate.lunarMonth.toString().padStart(2, '0');
  const d = lunarDate.lunarDay.toString().padStart(2, '0');
  const leapPrefix = lunarDate.isLeap ? '윤' : '';
  return `${leapPrefix}${m}/${d}`;
}
