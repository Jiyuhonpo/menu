
'use strict';

window.MenuApi = (() => {

  function endpoint() {
    const raw = (
      window.MENU_CONFIG &&
      window.MENU_CONFIG.apiUrl || ''
    ).trim();

    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(raw)) {
      throw new Error(
        'config.js の Apps Script URL を設定してください。'
      );
    }

    return raw;
  }

  // 公開される料理名を取得
  function read() {
    return new Promise((resolve, reject) => {
      let finished = false;

      const callback =
        '__menuReply_' +
        Math.random().toString(36).slice(2);

      const script = document.createElement('script');

      const timer = setTimeout(
        () => done(new Error('通信がタイムアウトしました。')),
        16000
      );

      function done(error, data) {
        if (finished) return;

        finished = true;
        clearTimeout(timer);

        delete window[callback];
        script.remove();

        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      }

      window[callback] = data => done(null, data);

      script.onerror = () => done(
        new Error('メニューを読み込めませんでした。')
      );

      try {
        script.src = endpoint()
          + '?action=menu&callback='
          + encodeURIComponent(callback)
          + '&_=' + Date.now();

        document.head.appendChild(script);
      } catch (error) {
        done(error);
      }
    });
  }

  // 管理画面の変更を保存
  async function save(
    password,
    previousRevision,
    dishes,
    nextRevision
  ) {

    const body = new URLSearchParams({
      action: 'save',
      password,
      previousRevision,
      nextRevision,
      dishes: JSON.stringify(dishes)
    });

    await fetch(endpoint(), {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'omit',
      body,
      redirect: 'follow',
      cache: 'no-store'
    });

    // 保存後、公開データを取得して確認
    for (let attempt = 0; attempt < 7; attempt++) {

      await new Promise(resolve =>
        setTimeout(resolve, 650 + attempt * 350)
      );

      const data = await read();

      if (
        data &&
        data.revision === nextRevision
      ) {
        return data;
      }

      if (
        data &&
        data.revision !== previousRevision
      ) {
        throw new Error(
          '別の更新が反映されています。' +
          '最新を再読み込みしてください。'
        );
      }
    }

    throw new Error(
      '保存が確認できませんでした。' +
      'パスワード・接続先・Apps Scriptの実行履歴を確認してください。'
    );
  }

  return {
    read,
    save,
    endpoint
  };

})();
