
'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  const config = window.MENU_CONFIG || {};

  document.getElementById('brand').textContent =
    config.restaurantName ||
    '赤坂リストランテ自由奔放';

  document.getElementById('brand-en').textContent =
    config.restaurantEnglish ||
    'RISTORANTE JIYUHONPO';

  const message = document.getElementById('message');
  const course = document.getElementById('course');

  try {
    const data = await MenuApi.read();

    if (
      !data ||
      !data.ok ||
      !Array.isArray(data.dishes)
    ) {
      throw new Error('メニューデータが不正です。');
    }

    course.replaceChildren();

    data.dishes.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      course.appendChild(li);
    });

    if (data.dishes.length) {
      message.hidden = true;
      course.hidden = false;
    } else {
      message.textContent =
        '現在メニューを準備しております。';
    }

  } catch (error) {
    message.textContent =
      'メニューを読み込めませんでした。' +
      '時間をおいて再度お試しください。';

    message.classList.add('error');

    console.error(error);
  }

});
