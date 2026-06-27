export const strings = {
  app: {
    title: "F1 Predictor 2026",
    tagline: "Прогнози результатів етапів Formula 1",
  },
  nav: {
    home: "Головна",
    calendar: "Календар",
    leaderboard: "Рейтинг",
    history: "Мої прогнози",
    profile: "Профіль",
  },
  actions: {
    makePrediction: "Зробити прогноз",
    viewResults: "Переглянути результати",
    predictionClosed: "Прогнозування закрито",
    save: "Зберегти",
    retry: "Спробувати ще раз",
    refresh: "Оновити",
    goToCalendar: "Перейти до календаря",
  },
  predictions: {
    save: "Зберегти прогноз",
    saved: "Прогноз збережено!",
    saveFailed: "Не вдалося зберегти прогноз. Спробуйте ще раз.",
    deadlinePassed: "Час для прогнозу на цей етап минув.",
    displayNameLabel: "Ваше ім'я",
    podiumMode: "Подиум",
    top10Mode: "TOP-10",
    dnfQuestion: "Яка команда не фінішує?",
    allFinish: "Усі боліди фінішують",
  },
  states: {
    apiUnavailable:
      "Дані тимчасово недоступні. Спробуйте оновити сторінку пізніше.",
    resultsEmpty: "Результати з'являться після завершення етапу.",
    leaderboardEmpty: "Рейтинг з'явиться після першого етапу.",
    historyEmpty:
      "Ви ще не зробили жодного прогнозу. Перейдіть до найближчого етапу.",
    stale: "оновлюється",
  },
  pages: {
    calendar: "Календар сезону",
    qualifying: "Кваліфікація",
    race: "Гонка",
    leaderboard: "Рейтинг",
    history: "Мої прогнози",
    profile: "Профіль",
    admin: "Адмін-панель",
  },
} as const;

export type Strings = typeof strings;
