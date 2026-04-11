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

const parseDateValue = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const normalized = dateValue.length > 10 ? dateValue.replace(" ", "T") : `${dateValue}T00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getAgeParts = (birthDateValue, nowDate) => {
  const birthDate = parseDateValue(birthDateValue);
  const current = nowDate || new Date();

  if (!birthDate) {
    return {
      years: 0,
      months: 0,
      days: 0
    };
  }

  let years = current.getFullYear() - birthDate.getFullYear();
  let months = current.getMonth() - birthDate.getMonth();
  let days = current.getDate() - birthDate.getDate();

  if (days < 0) {
    const previousMonth = new Date(current.getFullYear(), current.getMonth(), 0);
    days += previousMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days)
  };
};

const formatAge = (birthDateValue, nowDate) => {
  const parts = getAgeParts(birthDateValue, nowDate);
  return `${parts.years}岁${parts.months}月${parts.days}天`;
};

const formatTimeSince = (dateTimeValue, nowDate) => {
  const targetDate = parseDateValue(dateTimeValue);
  const current = nowDate || new Date();

  if (!targetDate) {
    return "还没有记录";
  }

  const diffMs = Math.max(0, current.getTime() - targetDate.getTime());
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) {
    return "刚刚";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const remainMinutes = diffMinutes % 60;
  if (diffHours < 24) {
    if (!remainMinutes) {
      return `${diffHours} 小时前`;
    }
    return `${diffHours} 小时 ${remainMinutes} 分钟前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "昨天";
  }

  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }

  return `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`;
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  today,
  humanDateLabel,
  minutesToDuration,
  sameDay,
  lastNDates,
  parseDateValue,
  formatAge,
  formatTimeSince
};
