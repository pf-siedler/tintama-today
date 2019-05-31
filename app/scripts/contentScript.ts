import { format, differenceInMinutes } from 'date-fns';

type Period = {
  start: Date;
  end: Date | null;
};

function main(): void {
  const table = <HTMLElement>document.querySelector('div.htBlock-adjastableTableF > div > table > tbody');
  const rows = table.children;
  const today = getTodayRow(rows);
  if (!today) {
    console.warn('今日の勤怠データを取得できませんでした');
    return;
  }
  const startTime = getStartTime(today);
  if (!startTime) {
    console.warn('出勤時刻を取得できませんでした');
    return;
  }
  const breaks = getBreaks(today);
  const numNotOver = breaks.filter(e => !e.end).length;
  if (numNotOver >= 2) {
    console.warn('終了していない休憩時間が複数あります');
    return;
  }
  const sumOfBreaks = breaks.map(e => durationMinites(e)).reduce((prev, current, _1, _2) => prev + current, 0);
  const fromStart = durationMinites({ start: startTime, end: null });
  const worktTime = fromStart - sumOfBreaks;
  console.log(`労働時間：${timeFormat(worktTime)}`);
  console.log(`休憩時間：${timeFormat(sumOfBreaks)}`);

  const dom = createDOM(worktTime, sumOfBreaks);
  document.body.insertBefore(dom, document.body.firstChild);
}

function getTodayRow(rows: HTMLCollection): Element | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows.item(i);
    if (!row) {
      continue;
    }
    const day = row.querySelector('td.htBlock-scrollTable_day > p');
    if (!day) {
      continue;
    }
    if (day.textContent && day.textContent.includes(format(new Date(), 'MM/DD'))) {
      return row;
    }
  }
  return null;
}

/**
 * 今日の出勤時間を取得する
 */
function getStartTime(todayRow: Element): Date | null {
  const td = todayRow.querySelectorAll('td.start_end_timerecord');
  for (let i = 0; i < td.length; i++) {
    const elem = td[i];
    if (elem.getAttribute('data-ht-sort-index') !== 'START_TIMERECORD') {
      continue;
    }
    const hourAndMinute = (elem.textContent || '').match(new RegExp('([0-9]{2}):([0-9]{2})'));
    if (!hourAndMinute) {
      continue;
    }
    const date = new Date();
    date.setHours(parseInt(hourAndMinute[1], 10));
    date.setMinutes(parseInt(hourAndMinute[2], 10));
    date.setSeconds(0, 0);
    return date;
  }
  return null;
}

/**
 * 休憩時間の一覧を取得する
 */
function getBreaks(todayRow: Element): Period[] {
  let startTimes: Date[] = [];
  let endTimes: Date[] = [];
  const td = todayRow.querySelectorAll('td.rest_timerecord');
  const extractTimes = (elem: Element) => {
    const t = (elem.textContent || '').match(new RegExp('[0-9]{2}:[0-9]{2}', 'g'));
    if (!t) {
      return [];
    }
    return t.map(hourAndMinute => {
      const d = new Date();
      const n = hourAndMinute.split(':');
      d.setHours(parseInt(n[0], 10));
      d.setMinutes(parseInt(n[1], 10));
      d.setSeconds(0, 0);
      return d;
    });
  };
  for (let i = 0; i < td.length; i++) {
    const elem = td[i];
    if (elem.getAttribute('data-ht-sort-index') === 'REST_START_TIMERECORD') {
      startTimes = extractTimes(elem);
    }
    if (elem.getAttribute('data-ht-sort-index') === 'REST_END_TIMERECORD') {
      endTimes = extractTimes(elem);
    }
  }
  return toSpan(startTimes, endTimes);
}

function toSpan(startTimes: Date[], endTimes: Date[]): Period[] {
  return startTimes.map((e, i) => ({ start: e, end: i < endTimes.length ? endTimes[i] : null }));
}

function durationMinites(timeSpan: Period): number {
  if (timeSpan.end) {
    return differenceInMinutes(timeSpan.end, timeSpan.start);
  }
  return differenceInMinutes(new Date(), timeSpan.start);
}

function timeFormat(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes - h * 60;

  return `${h}:${m >= 10 ? m : '0' + m}`;
}

function createDOM(worktTime: number, breakTime: number): HTMLElement {
  const appDOM = document.createElement('div');
  appDOM.className = 'tintama-today';
  const worktTimeDOM = document.createElement('div');
  const breakTimeDOM = document.createElement('div');
  worktTimeDOM.className = 'tintama-today--worktime';
  worktTimeDOM.textContent = `今日の労働時間：${timeFormat(worktTime)}`;
  breakTimeDOM.className = 'tintama-today--breaktime';
  breakTimeDOM.textContent = `休憩時間：${timeFormat(breakTime)}`;
  appDOM.appendChild(breakTimeDOM);
  appDOM.appendChild(worktTimeDOM);
  return appDOM;
}

main();
