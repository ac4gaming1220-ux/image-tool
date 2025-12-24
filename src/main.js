import { encode } from '@jsquash/webp';
import { registerSW } from 'virtual:pwa-register';

// PWA登録
registerSW({ immediate: true });

const input = document.getElementById('uploadInput');
const dropText = document.getElementById('dropText');
const preview = document.getElementById('preview');
const placeholderText = document.getElementById('placeholderText');
const metaInfo = document.getElementById('metaInfo');
const saveBtn = document.getElementById('saveBtn');

// 状態管理用の変数
let currentFile = null;

// 入力イベントの監視
input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        currentFile = e.target.files[0];
        dropText.textContent = `選択中: ${currentFile.name}`;
        processImage(); // 即実行
    }
});

// ラジオボタン（サイズ・クオリティ）の監視
// name="width" または name="quality" を持つすべてのラジオボタンに変更イベントをつける
document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (currentFile) processImage(); // 画像があれば再処理
    });
});

async function processImage() {
    if (!currentFile) return;

    // 処理中はボタンを無効化などの演出を入れても良い
    metaInfo.textContent = '変換中...';
    saveBtn.classList.remove('active');

    try {
        // 1. 設定値の取得 (選択されているラジオボタンの値を取る)
        const selectedWidth = parseInt(document.querySelector('input[name="width"]:checked').value);
        const selectedQuality = parseInt(document.querySelector('input[name="quality"]:checked').value);

        // 2. 画像読み込み & リサイズ計算
        const bitmap = await createImageBitmap(currentFile);
        
        let targetWidth = bitmap.width;
        let targetHeight = bitmap.height;

        // リサイズ計算（指定サイズより大きい場合のみ縮小するロジック）
        // ※もし「小さくても拡大」したい場合は if文を外してください
        if (targetWidth > selectedWidth) {
            targetHeight = Math.round(targetHeight * (selectedWidth / targetWidth));
            targetWidth = selectedWidth;
        }

        // 3. Canvas描画
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        // 高品質なリサイズのための設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // 4. Wasmエンコード (WebP変換)
        const webpBuffer = await encode(imageData, {
            quality: selectedQuality, // 30 or 75
            method: 4, // 速度と圧縮率のバランス
        });

        // 5. 結果の表示と保存ボタンへのセット
        const blob = new Blob([webpBuffer], { type: 'image/webp' });
        const url = URL.createObjectURL(blob);

        // プレビュー更新
        preview.src = url;
        preview.style.display = 'block';
        placeholderText.style.display = 'none';

        // 情報更新
        const origSize = (currentFile.size / 1024).toFixed(1);
        const newSize = (blob.size / 1024).toFixed(1);
        const reduction = Math.round((1 - blob.size / currentFile.size) * 100);

        metaInfo.innerHTML = `
            元: ${origSize} KB<br>
            ↓<br>
            <span class="size-highlight">${newSize} KB</span> (-${reduction}%)<br>
            サイズ: ${targetWidth} x ${targetHeight} px / 画質: ${selectedQuality}
        `;

        // 保存ボタンの更新
        const originalName = currentFile.name.replace(/\.[^.]+$/, '');
        saveBtn.href = url;
        saveBtn.download = `${originalName}_${selectedWidth}w_q${selectedQuality}.webp`; // ファイル名をわかりやすく
        saveBtn.textContent = '保存する';
        saveBtn.classList.add('active'); // ボタンを有効化

    } catch (error) {
        console.error(error);
        metaInfo.textContent = 'エラーが発生しました';
    }
}