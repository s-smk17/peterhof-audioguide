export type RoutePoint = {
  id: string;
  order: number;

  name: string;
  nameEn: string;

  description: string;
  descriptionEn: string;

  image: any;
  /** Автор и лицензия фото (Wikimedia Commons) */
  photoCredit: {
    author: string;
    license: string;
    url: string;
  };

  // Координаты остановки (OpenStreetMap)
  latitude: number | null;
  longitude: number | null;

  // Пока это примеры, сгенерированные синтезатором речи
  audioRu: any | null;
  audioEn: any | null;
};

export const routePoints: RoutePoint[] = [
  {
    id: "01-lomonosov-vokzal",
    order: 1,
    name: "Ломоносов — Вокзал",
    nameEn: "Lomonosov — Railway Station",
    description:
      "Начальная точка маршрута 343Э. Отсюда начинается путешествие.",
    descriptionEn:
      "The starting point of the 343E route. The journey begins here.",
    image: require("../../assets/images/stops/01.jpg"),
    photoCredit: {
      author: "Sergey A. Demidov",
      license: "CC BY 4.0",
      url: "https://commons.wikimedia.org/wiki/File:20250529_ES104_in_Oranienbaum_01.jpg",
    },
    latitude: 59.9174888,
    longitude: 29.7699554,
    audioRu: require("../../assets/audio/point-01.mp3"),
    audioEn: null,
  },

  {
    id: "02-eleninskaya",
    order: 2,
    name: "Еленинская улица",
    nameEn: "Eleninskaya Street",
    description:
      "Остановка в центральной части Ломоносова.",
    descriptionEn:
      "A stop in the central part of Lomonosov.",
    image: require("../../assets/images/stops/02.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B0%D0%BD%D0%B5%D0%B6%D0%BD%D0%B0%D1%8F_8%D0%B0,_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2_02.jpg",
    },
    latitude: 59.9141728,
    longitude: 29.768976,
    audioRu: require("../../assets/audio/point-02.mp3"),
    audioEn: null,
  },

  {
    id: "03-vladimirskaya",
    order: 3,
    name: "Владимирская улица",
    nameEn: "Vladimirskaya Street",
    description:
      "Остановка на Владимирской улице.",
    descriptionEn:
      "A stop on Vladimirskaya Street.",
    image: require("../../assets/images/stops/03.jpg"),
    photoCredit: {
      author: "MBH",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Lomonosov_town_04.jpg",
    },
    latitude: 59.9106014,
    longitude: 29.7699403,
    audioRu: require("../../assets/audio/point-03.mp3"),
    audioEn: null,
  },

  {
    id: "04-pobedy",
    order: 4,
    name: "Улица Победы",
    nameEn: "Pobedy Street",
    description:
      "Остановка на улице Победы в Ломоносове.",
    descriptionEn:
      "A stop on Pobedy Street in Lomonosov.",
    image: require("../../assets/images/stops/04.jpg"),
    photoCredit: {
      author: "MBH",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Lomonosov_town_05.jpg",
    },
    latitude: 59.9101993,
    longitude: 29.7736318,
    audioRu: require("../../assets/audio/point-04.mp3"),
    audioEn: null,
  },

  {
    id: "05-krasnoarmeyskaya",
    order: 5,
    name: "Красноармейская улица",
    nameEn: "Krasnoarmeyskaya Street",
    description:
      "Остановка на Красноармейской улице.",
    descriptionEn:
      "A stop on Krasnoarmeyskaya Street.",
    image: require("../../assets/images/stops/05.jpg"),
    photoCredit: {
      author: "Alexey Ivanov",
      license: "CC BY-SA 2.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%93%D0%B8%D0%BC%D0%BD%D0%B0%D0%B7%D0%B8%D1%8F_%E2%84%96_426_%D0%B2_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2%D0%B5_2015-03-13.jpg",
    },
    latitude: 59.9078377,
    longitude: 29.7738684,
    audioRu: require("../../assets/audio/point-05.mp3"),
    audioEn: null,
  },

  {
    id: "06-shveycarskaya",
    order: 6,
    name: "Швейцарская улица",
    nameEn: "Shveytsarskaya Street",
    description:
      "Остановка на улице Победы в районе Швейцарской улицы.",
    descriptionEn:
      "A stop on Pobedy Street near Shveytsarskaya Street.",
    image: require("../../assets/images/stops/06.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A3%D0%BB%D0%B8%D1%86%D0%B0_%D0%A1%D0%B2%D1%8F%D0%B7%D0%B8,_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2_02.jpg",
    },
    latitude: 59.9055105,
    longitude: 29.7719634,
    audioRu: require("../../assets/audio/point-06.mp3"),
    audioEn: null,
  },

  {
    id: "07-fedyuninskogo-pobedy",
    order: 7,
    name: "Федюнинского — улица Победы",
    nameEn: "Fedyuninskogo — Pobedy Street",
    description:
      "Остановка на пересечении улицы Федюнинского и улицы Победы.",
    descriptionEn:
      "A stop at the intersection of Fedyuninskogo and Pobedy Streets.",
    image: require("../../assets/images/stops/07.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A3%D0%BB%D0%B8%D1%86%D0%B0_%D0%A1%D0%B2%D1%8F%D0%B7%D0%B8,_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2_03.jpg",
    },
    latitude: 59.9024319,
    longitude: 29.7701314,
    audioRu: require("../../assets/audio/point-07.mp3"),
    audioEn: null,
  },

  {
    id: "08-fedyuninskogo-16",
    order: 8,
    name: "Улица Федюнинского, 16",
    nameEn: "Fedyuninskogo Street, 16",
    description:
      "Остановка на улице Федюнинского.",
    descriptionEn:
      "A stop on Fedyuninskogo Street.",
    image: require("../../assets/images/stops/08.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A3%D0%BB%D0%B8%D1%86%D0%B0_%D0%9F%D0%BE%D0%B1%D0%B5%D0%B4%D1%8B,_24,_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2.jpg",
    },
    latitude: 59.9005528,
    longitude: 29.7746038,
    audioRu: require("../../assets/audio/point-08.mp3"),
    audioEn: null,
  },

  {
    id: "09-oranienbaumsky",
    order: 9,
    name: "Ораниенбаумский проспект",
    nameEn: "Oranienbaum Avenue",
    description:
      "Остановка на Ораниенбаумском проспекте.",
    descriptionEn:
      "A stop on Oranienbaum Avenue.",
    image: require("../../assets/images/stops/09.jpg"),
    photoCredit: {
      author: "Alexey Ivanov",
      license: "CC BY-SA 2.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A8%D0%BA%D0%BE%D0%BB%D0%B0_%E2%84%96_430_%D0%B2_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2%D0%B5_2015-03-21.jpg",
    },
    latitude: 59.8995622,
    longitude: 29.7786999,
    audioRu: require("../../assets/audio/point-09.mp3"),
    audioEn: null,
  },

  {
    id: "10-fedyuninskogo",
    order: 10,
    name: "Улица Федюнинского",
    nameEn: "Fedyuninskogo Street",
    description:
      "Остановка на улице Федюнинского.",
    descriptionEn:
      "A stop on Fedyuninskogo Street.",
    image: require("../../assets/images/stops/10.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%B0%D1%8F_%D1%83%D0%BB%D0%B8%D1%86%D0%B0,_%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2,_%D0%B2%D0%B8%D0%B4_%D1%81_%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%BC.jpg",
    },
    latitude: 59.8946252,
    longitude: 29.7963898,
    audioRu: require("../../assets/audio/point-10.mp3"),
    audioEn: null,
  },

  {
    id: "11-svyazi",
    order: 11,
    name: "Улица Связи",
    nameEn: "Svyazi Street",
    description:
      "Остановка на улице Связи.",
    descriptionEn:
      "A stop on Svyazi Street.",
    image: require("../../assets/images/stops/11.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%9F%D0%B0%D0%B2%D0%BB%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82_(%D0%9B%D0%BE%D0%BC%D0%BE%D0%BD%D0%BE%D1%81%D0%BE%D0%B2)_01.jpg",
    },
    latitude: 59.897666,
    longitude: 29.8070411,
    audioRu: require("../../assets/audio/point-11.mp3"),
    audioEn: null,
  },

  {
    id: "12-novogorskaya",
    order: 12,
    name: "Новогорская улица",
    nameEn: "Novogorskaya Street",
    description:
      "Остановка на Новогорской улице.",
    descriptionEn:
      "A stop on Novogorskaya Street.",
    image: require("../../assets/images/stops/12.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:ORANEL_bridge_pedestrial_part.jpg",
    },
    latitude: 59.8997982,
    longitude: 29.81431,
    audioRu: require("../../assets/audio/point-12.mp3"),
    audioEn: null,
  },

  {
    id: "13-zhory-antonenko",
    order: 13,
    name: "Улица Жоры Антоненко",
    nameEn: "Zhory Antonenko Street",
    description:
      "Остановка на улице Жоры Антоненко.",
    descriptionEn:
      "A stop on Zhory Antonenko Street.",
    image: require("../../assets/images/stops/13.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A4%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%D1%8F_%D0%BA%D0%B8%D1%80%D1%85%D0%B0_%D1%81%D0%B2._%D0%98%D0%BE%D0%B0%D0%BD%D0%BD%D0%B0_03.jpg",
    },
    latitude: 59.9020926,
    longitude: 29.8177905,
    audioRu: require("../../assets/audio/point-13.mp3"),
    audioEn: null,
  },

  {
    id: "14-mordvinovka",
    order: 14,
    name: "Мордвиновка",
    nameEn: "Mordvinovka",
    description:
      "Остановка в районе Мордвиновки.",
    descriptionEn:
      "A stop in the Mordvinovka area.",
    image: require("../../assets/images/stops/14.jpg"),
    photoCredit: {
      author: "Книжная пыль",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B5%D0%B2%D0%BA%D0%B0_%D0%9C%D0%BE%D1%81%D1%82-%D0%BF%D0%BB%D0%BE%D1%82%D0%B8%D0%BD%D0%B0_%D0%98%D1%8E%D0%BB%D1%8C_2025-_03.jpg",
    },
    latitude: 59.8988884,
    longitude: 29.8290334,
    audioRu: require("../../assets/audio/point-14.mp3"),
    audioEn: null,
  },

  {
    id: "15-fabrichnaya",
    order: 15,
    name: "Фабричная улица",
    nameEn: "Fabrichnaya Street",
    description:
      "Остановка на Фабричной улице.",
    descriptionEn:
      "A stop on Fabrichnaya Street.",
    image: require("../../assets/images/stops/15.jpg"),
    photoCredit: {
      author: "MaryannaNesina",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%91%D0%BB%D0%B0%D0%BD-%D0%9C%D0%B5%D0%BD%D0%B8%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F_%D1%83%D0%BB%D0%B8%D1%86%D0%B0_%D0%B8_%D0%9F%D0%B5%D1%82%D1%80%D0%BE%D0%B4%D0%B2%D0%BE%D1%80%D1%86%D0%BE%D0%B2%D1%8B%D0%B9_%D1%87%D0%B0%D1%81%D0%BE%D0%B2%D0%BE%D0%B9_%D0%B7%D0%B0%D0%B2%D0%BE%D0%B4.jpg",
    },
    latitude: 59.8827654,
    longitude: 29.8900683,
    audioRu: require("../../assets/audio/point-15.mp3"),
    audioEn: null,
  },

  {
    id: "16-razvodnaya",
    order: 16,
    name: "Разводная улица",
    nameEn: "Razvodnaya Street",
    description:
      "Остановка на Разводной улице.",
    descriptionEn:
      "A stop on Razvodnaya Street.",
    image: require("../../assets/images/stops/16.jpg"),
    photoCredit: {
      author: "Anastasiya Lvova",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%A1%D0%B0%D0%BC%D1%81%D0%BE%D0%BD%D0%B8%D0%B5%D0%B2%D1%81%D0%BA%D0%B0%D1%8F_%D1%83%D0%BB%D0%B8%D1%86%D0%B0_%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B3%D0%BE%D1%84_01.jpg",
    },
    latitude: 59.8807609,
    longitude: 29.9038791,
    audioRu: require("../../assets/audio/point-16.mp3"),
    audioEn: null,
  },

  {
    id: "17-nikolaevskaya",
    order: 17,
    name: "Николаевская больница",
    nameEn: "Nikolaevskaya Hospital",
    description:
      "Остановка у Николаевской больницы на Константиновской улице.",
    descriptionEn:
      "A stop near Nikolaevskaya Hospital on Konstantinovskaya Street.",
    image: require("../../assets/images/stops/17.jpg"),
    photoCredit: {
      author: "Никонико962",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D0%BB%D0%BE%D0%B9_%D0%B4%D0%BE%D0%BC_%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%D1%81%D0%BA%D0%B8%D0%B9_%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82_25_%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B3%D0%BE%D1%84_2026_02.jpg",
    },
    latitude: 59.878824,
    longitude: 29.9171965,
    audioRu: require("../../assets/audio/point-17.mp3"),
    audioEn: null,
  },

  {
    id: "18-avrova",
    order: 18,
    name: "Улица Аврова",
    nameEn: "Avrova Street",
    description:
      "Остановка на улице Аврова.",
    descriptionEn:
      "A stop on Avrova Street.",
    image: require("../../assets/images/stops/18.jpg"),
    photoCredit: {
      author: "Никонико962",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%94%D0%BE%D0%BC_%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B8%D1%80%D0%B0_%D0%A3%D0%BB%D0%B0%D0%BD%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%BF%D0%BE%D0%BB%D0%BA%D0%B0_%D1%83%D0%BB%D0%B8%D1%86%D0%B0_%D0%90%D0%B2%D1%80%D0%BE%D0%B2%D0%B0_7_%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B3%D0%BE%D1%84_2026_01.jpg",
    },
    latitude: 59.8778959,
    longitude: 29.9237411,
    audioRu: require("../../assets/audio/point-18.mp3"),
    audioEn: null,
  },

  {
    id: "19-krylova",
    order: 19,
    name: "Улица Крылова",
    nameEn: "Krylova Street",
    description:
      "Остановка на улице Крылова.",
    descriptionEn:
      "A stop on Krylova Street.",
    image: require("../../assets/images/stops/19.jpg"),
    photoCredit: {
      author: "Юлианна",
      license: "CC BY-SA 3.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%9C%D1%83%D0%B7%D0%B5%D0%B9_%22%D0%9A%D0%BE%D1%82%D1%82%D0%B5%D0%B4%D0%B6%22.JPG",
    },
    latitude: 59.8572924,
    longitude: 30.0082318,
    audioRu: require("../../assets/audio/point-19.mp3"),
    audioEn: null,
  },

  {
    id: "20-kropotkinskaya",
    order: 20,
    name: "Кропоткинская улица",
    nameEn: "Kropotkinskaya Street",
    description:
      "Остановка на Кропоткинской улице.",
    descriptionEn:
      "A stop on Kropotkinskaya Street.",
    image: require("../../assets/images/stops/20.jpg"),
    photoCredit: {
      author: "Дмитрий Cкляренко",
      license: "CC BY 3.0",
      url: "https://commons.wikimedia.org/wiki/File:Strelna,_Saint_Petersburg,_Russia,_198515_-_panoramio_(12).jpg",
    },
    latitude: 59.8544647,
    longitude: 30.0220265,
    audioRu: require("../../assets/audio/point-20.mp3"),
    audioEn: null,
  },

  {
    id: "21-frontovaya",
    order: 21,
    name: "Фронтовая улица",
    nameEn: "Frontovaya Street",
    description:
      "Остановка на Фронтовой улице.",
    descriptionEn:
      "A stop on Frontovaya Street.",
    image: require("../../assets/images/stops/21.jpg"),
    photoCredit: {
      author: "Lion10~commonswiki",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%94%D0%BE%D0%BC_%D0%BF%D1%80%D0%B8%D0%B2%D1%80%D0%B0%D1%82%D0%BD%D0%B8%D0%BA%D0%B0_%D0%B2_%D0%A1%D1%82%D1%80%D0%B5%D0%BB%D1%8C%D0%BD%D0%B5.jpg",
    },
    latitude: 59.8525966,
    longitude: 30.0378304,
    audioRu: require("../../assets/audio/point-21.mp3"),
    audioEn: null,
  },

  {
    id: "22-budennogo",
    order: 22,
    name: "Проспект Будённого",
    nameEn: "Budyonny Avenue",
    description:
      "Остановка на проспекте Будённого.",
    descriptionEn:
      "A stop on Budyonny Avenue.",
    image: require("../../assets/images/stops/22.jpg"),
    photoCredit: {
      author: "MBH",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Holy_Trinity_St._Sergius_Primorskaya_Pustyn_01.jpg",
    },
    latitude: 59.8529746,
    longitude: 30.0914135,
    audioRu: require("../../assets/audio/point-22.mp3"),
    audioEn: null,
  },

  {
    id: "23-rogachevsky",
    order: 23,
    name: "Рогачёвский переулок",
    nameEn: "Rogachevsky Lane",
    description:
      "Остановка в районе Рогачёвского переулка.",
    descriptionEn:
      "A stop near Rogachevsky Lane.",
    image: require("../../assets/images/stops/23.jpg"),
    photoCredit: {
      author: "Anna Esh",
      license: "CC BY-SA 3.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%94%D0%B0%D1%87%D0%B0_%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D1%86%D0%BE%D0%B2%D0%B0_%C2%AB%D0%9D%D0%BE%D0%B2%D0%BE%D0%B7%D0%BD%D0%B0%D0%BC%D0%B5%D0%BD%D0%BA%D0%B0%C2%BB_(%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3_%D0%B8_%D0%9B%D0%B5%D0%BD.%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C,_%D0%A7%D0%B5%D0%BA%D0%B8%D1%81%D1%82%D0%BE%D0%B2_%D1%83%D0%BB%D0%B8%D1%86%D0%B0,_13).JPG",
    },
    latitude: 59.8408196,
    longitude: 30.1301119,
    audioRu: require("../../assets/audio/point-23.mp3"),
    audioEn: null,
  },

  {
    id: "24-pionerstroya",
    order: 24,
    name: "Улица Пионерстроя",
    nameEn: "Pionerstroya Street",
    description:
      "Остановка на пересечении улицы Пионерстроя и проспекта Ветеранов.",
    descriptionEn:
      "A stop at the intersection of Pionerstroya Street and Veteranov Avenue.",
    image: require("../../assets/images/stops/24.jpg"),
    photoCredit: {
      author: "Spb.Terminator",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%9F%D0%B0%D1%80%D0%BA_%D0%A1%D0%BE%D1%81%D0%BD%D0%BE%D0%B2%D0%B0%D1%8F_%D0%9F%D0%BE%D0%BB%D1%8F%D0%BD%D0%B0_8.jpg",
    },
    latitude: 59.8353881,
    longitude: 30.1279068,
    audioRu: require("../../assets/audio/point-24.mp3"),
    audioEn: null,
  },

  {
    id: "25-pogranichnika",
    order: 25,
    name: "Пограничника Гарькавого",
    nameEn: "Pogranichnika Garkavogo",
    description:
      "Остановка на проспекте Ветеранов у улицы Пограничника Гарькавого.",
    descriptionEn:
      "A stop on Veteranov Avenue near Pogranichnika Garkavogo Street.",
    image: require("../../assets/images/stops/25.jpg"),
    photoCredit: {
      author: "Artyom Svetlov",
      license: "CC BY 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Saint_Petersburg_tram_7402_2015-07_1436033557_Prospekt_Veteranov_71-631.JPG",
    },
    latitude: 59.8353814,
    longitude: 30.1478406,
    audioRu: require("../../assets/audio/point-25.mp3"),
    audioEn: null,
  },

  {
    id: "26-avangardnaya",
    order: 26,
    name: "Авангардная улица",
    nameEn: "Avangardnaya Street",
    description:
      "Остановка на Авангардной улице.",
    descriptionEn:
      "A stop on Avangardnaya Street.",
    image: require("../../assets/images/stops/26.jpg"),
    photoCredit: {
      author: "Spb.Terminator",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%90%D0%BB%D0%BB%D0%B5%D1%8F_%D0%A1%D0%BB%D0%B0%D0%B2%D1%8B_%D0%9F%D0%BE%D0%BB%D0%B5%D0%B6%D0%B0%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%BF%D0%B0%D1%80%D0%BA_9.jpg",
    },
    latitude: 59.83301,
    longitude: 30.182955,
    audioRu: require("../../assets/audio/point-26.mp3"),
    audioEn: null,
  },

  {
    id: "27-marshal-zhukov",
    order: 27,
    name: "Проспект Маршала Жукова",
    nameEn: "Marshal Zhukov Avenue",
    description:
      "Остановка на проспекте Маршала Жукова.",
    descriptionEn:
      "A stop on Marshal Zhukov Avenue.",
    image: require("../../assets/images/stops/27.jpg"),
    photoCredit: {
      author: "Spb.Terminator",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%D0%9F%D1%80._%D0%9C%D0%B0%D1%80%D1%88%D0%B0%D0%BB%D0%B0_%D0%96%D1%83%D0%BA%D0%BE%D0%B2%D0%B0_9.jpg",
    },
    latitude: 59.832987,
    longitude: 30.1958451,
    audioRu: require("../../assets/audio/point-27.mp3"),
    audioEn: null,
  },

  {
    id: "28-soldat-korzun",
    order: 28,
    name: "Улица Солдата Корзуна",
    nameEn: "Soldat Korzun Street",
    description:
      "Остановка на улице Солдата Корзуна.",
    descriptionEn:
      "A stop on Soldat Korzun Street.",
    image: require("../../assets/images/stops/28.jpg"),
    photoCredit: {
      author: "Artyom Svetlov",
      license: "CC BY 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Saint_Petersburg_trolleybus_1338_2015-07_1436038621_Prospekt_Veteranov_Trolza-5265.JPG",
    },
    latitude: 59.8338203,
    longitude: 30.2189469,
    audioRu: require("../../assets/audio/point-28.mp3"),
    audioEn: null,
  },

  {
    id: "29-prospekt-veteranov",
    order: 29,
    name: "Метро «Проспект Ветеранов»",
    nameEn: "Prospekt Veteranov Metro",
    description:
      "Финальная точка маршрута 343Э.",
    descriptionEn:
      "The final point of the 343E route.",
    image: require("../../assets/images/stops/29.jpg"),
    photoCredit: {
      author: "Artyom Svetlov",
      license: "CC BY 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Saint_Petersburg_Prospekt_Veteranov_2025-03_1099.JPG",
    },
    latitude: 59.8426879,
    longitude: 30.2454073,
    audioRu: require("../../assets/audio/point-29.mp3"),
    audioEn: null,
  },
];

export default routePoints;