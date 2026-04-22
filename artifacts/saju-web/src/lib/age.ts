export function getCurrentAge(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  now = new Date(),
): number {
  let age = now.getFullYear() - birthYear;
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age -= 1;
  }

  return age;
}
