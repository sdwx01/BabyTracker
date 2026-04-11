const pad = (value: number) => `${value}`.padStart(2, "0");

export const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatTime = (date: Date) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateTime = (date: Date) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const mergeDateAndTime = (dateValue: string, timeValue: string) => {
  return new Date(`${dateValue}T${timeValue}:00`);
};

export const today = () => formatDate(new Date());

export const humanDateLabel = (dateValue: string) => {
  const [year, month, day] = dateValue.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
};

export const minutesToDuration = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes} 分钟`;
  }

  if (!minutes) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
};

export const sameDay = (leftIso: string, rightDate: string) => leftIso.slice(0, 10) === rightDate;

export const lastNDates = (count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return formatDate(date);
  }).reverse();
};
