import { encode } from '@jsquash/webp';
import { registerSW } from 'virtual:pwa-register';

// PWA設定
registerSW({ immediate: true });

// DOM要素の取得
const uploadInput = document.getElementById('uploadInput');
const dropZone = document.getElementById('dropZone');
const resultContainer = document.getElementById('result-container');
const statusMessage = document.getElementById('statusMessage');

// --- イベントリスナー設定 ---

// 1. クリックでファイル選択
dropZone.addEventListener('click', () => uploadInput.click());

// 2. ドラッグ&ドロップの挙動制御
const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
};

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

dropZone.addEventListener('dragover', () => dropZone.classList.add('highlight'));
['dragleave', 'drop'].forEach(() => dropZone.classList.remove('highlight'));

// 3. ファイル取得時の処理
dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
uploadInput.addEventListener('change', (e) => handleFiles(e.target.files));


// --- メイン処理 ---

async function handleFiles(files) {
    if (files.length === 0) return;

    // 設定値の取得
    const widthOption = document.querySelector('input[name="width"]:checked').value;
    const qualityOption = parseInt(document.querySelector('input[name="quality"]:checked').value);

    // UI初期化
    statusMessage.style.display = 'block';
    statusMessage.textContent = 'Wasmモジュール準備中...';
    resultContainer.innerHTML = ''; // 結果エリアをリセット

    // ループ処理
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 画像以外はスキップ
        if (!file.type.startsWith('image/')) continue;

        statusMessage.textContent = `変換中... (${i + 1} / ${files.length}): ${file.name}`;
        
        // 処理が重くなりすぎないよう少し待機
        await new Promise(r => setTimeout(r, 10)); 
        
        await processSingleImage(file, widthOption, qualityOption);
    }

    statusMessage.textContent = 'すべての処理が完了しました！';
    setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);
}


// --- 1枚ごとの変換処理 (Wasm使用) ---

async function processSingleImage(file, targetWidthStr, quality) {
    try {
        const bitmap = await createImageBitmap(file);
        
        let targetWidth = bitmap.width;
        let targetHeight = bitmap.height;

        // リサイズ計算
        if (targetWidthStr !== 'original') {
            const maxW = parseInt(targetWidthStr);
            if (targetWidth > maxW) {
                targetHeight = Math.round(targetHeight * (maxW / targetWidth));
                targetWidth = maxW;
            }
        }

        // Canvasへの描画
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        
        // Pixelデータの取得
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // @jsquash/webp でエンコード
        const webpBuffer = await encode(imageData, {
            quality: quality,
            method: 4, // 圧縮効率重視
        });

        // Blob作成
        const blob = new Blob([webpBuffer], { type: 'image/webp' });
        const dataUrl = URL.createObjectURL(blob);

        // 結果カードの作成と表示
        createResultCard(dataUrl, file, blob, targetWidth, targetHeight);

    } catch (error) {
        console.error('Conversion Error:', error);
        alert(`${file.name} の変換中にエラーが発生しました。`);
    }
}

// --- 結果表示用カード生成 ---

function createResultCard(dataUrl, originalFile, newBlob, w, h) {
    const div = document.createElement('div');
    div.className = 'img-card';

    // プレビュー画像
    const img = document.createElement('img');
    img.src = dataUrl;

    // ファイル名（拡張子変更）
    const nameP = document.createElement('p');
    nameP.className = 'file-name';
    const newName = originalFile.name.replace(/\.[^.]+$/, '') + '.webp';
    nameP.textContent = newName;

    // サイズ情報
    const sizeP = document.createElement('p');
    sizeP.className = 'file-size';
    const newSizeKB = (newBlob.size / 1024).toFixed(1);
    const reduction = Math.round((1 - newBlob.size / originalFile.size) * 100);
    sizeP.textContent = `${newSizeKB} KB (-${reduction}%)`;

    // ダウンロードボタン
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = newName;
    link.className = 'download-btn';
    link.textContent = '保存';

    div.appendChild(img);
    div.appendChild(nameP);
    div.appendChild(sizeP);
    div.appendChild(link);
    
    resultContainer.appendChild(div);
}