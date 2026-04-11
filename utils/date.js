const pad = (value) => `${value}`.padStart(2, "0");

const formatDate = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTime = (date) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (date) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

const today = () => formatDate(new Date());

const humanDateLabel = (dateValue) => {
  const [year, month, day] = dateValue.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
};

const minutesToDuration = (totalMinutes) => {
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

const sameDay = (leftIso, rightDate) => leftIso.slice(0, 10) === rightDate;

const lastNDates = (count) => {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return formatDate(date);
  }).reverse();
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  today,
  humanDateLabel,
  minutesToDuration,
  sameDay,
  lastNDates
};
