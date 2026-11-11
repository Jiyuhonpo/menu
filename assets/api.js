
'use strict';

window.MenuApi = (() => {

  // GASの接続先
  function endpoint() {
    const url = String(
      window.MENU_CONFIG?.apiUrl || ''
    ).trim();

    if (
      !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)
    ) {
      throw new Error(
        'config.js の Apps Script URL を確認してください。'
      );
    }

    return url;
  }

  // メニューデータの取得（JSONP）
  function read() {
    return new Promise((resolve, reject) => {

      const callback =
        '__menuReply_' +
        Math.random().toString(36).slice(2);

      const script = document.createElement('script');

      let finished = false;

      const timer = setTimeout(() => {
        finish(new Error('読み込みがタイムアウトしました。'));
      }, 20000);

      function finish(error, data) {
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

      window[callback] = data => {
        finish(null, data);
      };

      script.onerror = () => {
        finish(
          new Error('メニューの取得に失敗しました。')
        );
      };

      try {
        script.src =
          endpoint() +
          '?action=menu' +
          '&callback=' +
          encodeURIComponent(callback) +
          '&_=' + Date.now();

        document.head.appendChild(script);

      } catch (error) {
        finish(error);
      }
    });
  }

  // GASへフォーム形式でPOST送信
  function postForm(payload) {
    return new Promise((resolve, reject) => {

      const id =
        'menu_post_' +
        Date.now() + '_' +
        Math.random().toString(36).slice(2);

      const frame = document.createElement('iframe');

      frame.name = id;
      frame.style.display = 'none';
      frame.setAttribute('aria-hidden', 'true');

      const form = document.createElement('form');

      form.method = 'POST';
      form.action = endpoint();
      form.target = id;
      form.style.display = 'none';
      form.acceptCharset = 'UTF-8';

      Object.entries(payload).forEach(([key, value]) => {

        const input = document.createElement('input');

        input.type = 'hidden';
        input.name = key;
        input.value = String(value);

        form.appendChild(input);
      });

      document.body.appendChild(frame);
      document.body.appendChild(form);

      try {
        // ブラウザの通常フォーム送信で
        // GASのdoPostを呼び出す
        form.submit();
        resolve();

      } catch (error) {
        reject(error);

      } finally {
        // 通信中のフレームは保存確認後まで保持
        window.__menuPostFrames =
          window.__menuPostFrames || [];

        window.__menuPostFrames.push({
          form,
          frame
        });
      }
    });
  }

  // フォームを削除
  function cleanupForms() {
    const entries = window.__menuPostFrames || [];

    entries.forEach(({ form, frame }) => {
      form.remove();
      frame.remove();
    });

    window.__menuPostFrames = [];
  }

  function sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  // 保存処理
  async function save(
    password,
    previousRevision,
    dishes,
    nextRevision
  ) {

    const payload = {
      action: 'save',
      password: password,
      previousRevision: previousRevision,
      nextRevision: nextRevision,
      dishes: JSON.stringify(dishes)
    };

    try {
      await postForm(payload);

      // GAS側の処理完了を待ちながら
      // 更新番号を確認する
      for (let i = 0; i < 12; i++) {

        await sleep(900 + i * 150);

        let data;

        try {
          data = await read();
        } catch (error) {
          continue;
        }

        if (!data || !data.ok) {
          continue;
        }

        // 保存が正常に反映された
        if (data.revision === nextRevision) {
          return data;
        }

        // 別の更新が反映された
        if (
          data.revision !== previousRevision &&
          data.revision !== nextRevision
        ) {
          throw new Error(
            '別の更新が反映されています。' +
            '最新のメニューを再読み込みしてください。'
          );
        }
      }

      throw new Error(
        '保存を確認できませんでした。' +
        'GASの実行履歴でdoPostを確認してください。'
      );

    } finally {
      cleanupForms();
    }
  }

  return {
    endpoint,
    read,
    save
  };

})();
