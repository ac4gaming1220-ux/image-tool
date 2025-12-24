import { encode } from '@jsquash/webp';
import { registerSW } from 'virtual:pwa-register';

// PWA設定
registerSW({ immediate: true });

// DOM要素の取得
const uploadInput = document.getElementById('uploadInput');
const dropZone = document.getElementById('dropZone');
const resultContainer = document.getElementById('result-container');
const statusMessage = document.getElementById('statusMessage');

// ★追加: 現在選択中のファイルを保持するリスト
let currentFiles = [];

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

// 3. ファイル取得時の処理（保存して処理開始）
dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files);
    handleNewFiles(files);
});

uploadInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleNewFiles(files);
});

// ★追加: ラジオボタンの変更を検知して再処理
const radioInputs = document.querySelectorAll('input[type="radio"]');
radioInputs.forEach(input => {
    input.addEventListener('change', () => {
        // すでに画像が選択されていたら再変換を実行
        if (currentFiles.length > 0) {
            processBatch(currentFiles);
        }
    });
});


// --- メイン処理 ---

// 新しいファイルが来たときの処理
function handleNewFiles(files) {
    // 画像のみにフィルタリング
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    // ★リストを更新して処理開始
    currentFiles = imageFiles;
    processBatch(currentFiles);
}

// 一括処理関数
async function processBatch(files) {
    // 設定値の取得 (現在のDOMの状態を見る)
    const widthOption = document.querySelector('input[name="width"]:checked').value;
    const qualityOption = parseInt(document.querySelector('input[name="quality"]:checked').value);

    // UI初期化
    statusMessage.style.display = 'block';
    statusMessage.textContent = 'Wasmモジュール準備中...';
    resultContainer.innerHTML = ''; // 結果エリアをリセット

    // ループ処理
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        statusMessage.textContent = `変換中... (${i + 1} / ${files.length}): ${file.name}`;
        
        // 処理が重くなりすぎないよう少し待機 (UIスレッドを解放)
        await new Promise(r => setTimeout(r, 10)); 
        
        await processSingleImage(file, widthOption, qualityOption);
    }

    statusMessage.textContent = '完了しました！';
    setTimeout(() => { statusMessage.style.display = 'none'; }, 2000);
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
        // エラー時はアラートを出さずにコンソールのみ（連続処理を止めないため）
        statusMessage.textContent = `エラー: ${file.name}`;
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
    
    // 赤字で軽量化率を表示
    sizeP.innerHTML = `${newSizeKB} KB <span style="color:#d63384">(-${reduction}%)</span>`;

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