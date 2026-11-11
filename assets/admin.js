
'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const el = id => document.getElementById(id);

  const status = el('status');
  const password = el('password');
  const editor = el('dish-editor');
  const panel = el('editor-panel');

  let dishes = [];
  let revision = '';
  let busy = false;

  function tell(message, type = '') {
    status.className = 'status ' + type;
    status.textContent = message;
  }

  function setBusy(value) {
    busy = value;

    [
      'load-btn',
      'save-btn',
      'reload-btn',
      'add-btn'
    ].forEach(id => {
      el(id).disabled = value;
    });
  }

  // 編集画面を描画
  function render() {
    editor.replaceChildren();

    dishes.forEach((name, idx) => {

      const card = document.createElement('div');
      card.className = 'dish-card';

      const main = document.createElement('div');

      const number = document.createElement('label');
      number.className = 'number';
      number.textContent = '料理 ' + (idx + 1);

   
const input = document.createElement('textarea');

input.value = name;
input.maxLength = 200;
input.rows = 2;

input.placeholder = '料理名を入力してください';

input.style.width = '100%';
input.style.minHeight = '90px';
input.style.padding = '13px 12px';
input.style.border = '1px solid #d8d8d2';
input.style.borderRadius = '9px';
input.style.fontSize = '16px';
input.style.lineHeight = '1.8';
input.style.resize = 'vertical';
input.style.fontFamily = 'inherit';
input.style.boxSizing = 'border-box';


      input.setAttribute(
        'aria-label',
        '料理 ' + (idx + 1) + ' の料理名'
      );

      input.addEventListener('input', () => {
        dishes[idx] = input.value;
      });

      main.append(number, input);

      const controls = document.createElement('div');
      controls.className = 'controls';

      const buttons = [
        {
          label: '↑',
          tip: '一つ上に移動',
          action: () => {
            if (idx > 0) {
              [
                dishes[idx - 1],
                dishes[idx]
              ] = [
                dishes[idx],
                dishes[idx - 1]
              ];

              render();
            }
          },
          disabled: idx === 0
        },
        {
          label: '↓',
          tip: '一つ下に移動',
          action: () => {
            if (idx < dishes.length - 1) {
              [
                dishes[idx + 1],
                dishes[idx]
              ] = [
                dishes[idx],
                dishes[idx + 1]
              ];

              render();
            }
          },
          disabled: idx === dishes.length - 1
        },
        {
          label: '×',
          tip: '料理を削除',
          action: () => {
            if (
              confirm(
                'この料理を一覧から削除しますか？'
              )
            ) {
              dishes.splice(idx, 1);
              render();
            }
          },
          disabled: false
        }
      ];

      buttons.forEach(spec => {
        const b = document.createElement('button');

        b.type = 'button';
        b.className = 'icon-btn';
        b.textContent = spec.label;
        b.title = spec.tip;

        b.setAttribute(
          'aria-label',
          spec.tip + '：料理 ' + (idx + 1)
        );

        b.disabled = spec.disabled || busy;

        b.addEventListener('click', spec.action);

        controls.appendChild(b);
      });

      card.append(main, controls);
      editor.appendChild(card);
    });
  }

  // 最新メニューを取得
  async function load() {
    setBusy(true);

    tell('最新のメニューを取得しています...');

    try {
      MenuApi.endpoint();

      const data = await MenuApi.read();

      if (
        !data.ok ||
        !Array.isArray(data.dishes)
      ) {
        throw new Error(
          'サーバーから有効なデータが返りませんでした。'
        );
      }

      dishes = data.dishes.slice();
      revision = data.revision || '';

      panel.hidden = false;

      render();

      tell(
        '読み込みました。保存時に管理パスワードを確認します。',
        'success'
      );

    } catch (error) {
      tell(error.message, 'error');

    } finally {
      setBusy(false);
    }
  }

  // 読み込みボタン
  el('load-btn').addEventListener('click', load);

  // 再読み込み
  el('reload-btn').addEventListener('click', () => {

    if (
      confirm(
        '保存していない変更を破棄して再読み込みしますか？'
      )
    ) {
      load();
    }
  });

  // 料理を追加
  el('add-btn').addEventListener('click', () => {

    if (dishes.length >= 60) {
      tell('料理は最大60品です。', 'error');
      return;
    }

    dishes.push('');

    render();

    const inputs = editor.querySelectorAll('textarea');

    inputs[inputs.length - 1]?.focus();
  });

  // 変更を保存
  el('save-btn').addEventListener('click', async () => {

    const clean = dishes
      .map(x => x.trim())
      .filter(Boolean);

    if (!clean.length) {
      tell(
        '料理名を1品以上入力してください。',
        'error'
      );
      return;
    }

    if (
      clean.length > 60 ||
      clean.some(
        x => x.length > 200 ||
        /^[=+\-@]/.test(x)
      )
    ) {
      tell(
        '料理名は各200文字以内、最大60品です。' +
        '先頭に = + - @ は使えません。',
        'error'
      );
      return;
    }

    if (!password.value) {
      tell(
        '管理パスワードを入力してください。',
        'error'
      );

      password.focus();
      return;
    }

    const next = 'v_' + (
      crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now() + '_' +
          Math.random().toString(36).slice(2)
    );

    setBusy(true);

    tell('保存して公開データを確認しています...');

    try {
      const data = await MenuApi.save(
        password.value,
        revision,
        clean,
        next
      );

      dishes = data.dishes.slice();
      revision = data.revision;

      render();

      tell(
        '保存完了。公開メニューにも反映されています。',
        'success'
      );

      password.value = '';

    } catch (error) {
      tell(error.message, 'error');

    } finally {
      setBusy(false);
    }
  });

});
