import { encode } from '@jsquash/webp';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

// 要素の取得
const dropZone = document.getElementById('dropZone'); // 追加
const input = document.getElementById('uploadInput');
const dropText = document.getElementById('dropText');
const preview = document.getElementById('preview');
const placeholderText = document.getElementById('placeholderText');
const metaInfo = document.getElementById('metaInfo');
const saveBtn = document.getElementById('saveBtn');

let currentFile = null;

// --- ドラッグ&ドロップの処理 ---

// 1. エリアをクリックしたらファイル選択を開く
dropZone.addEventListener('click', () => input.click());

// 2. ドラッグ中の見た目変更 & デフォルト挙動の無効化
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

;['dragenter', 'dragover'].forEach(() => {
    dropZone.classList.add('highlight');
});

;['dragleave', 'drop'].forEach(() => {
    dropZone.classList.remove('highlight');
});

// 3. ファイルがドロップされた時の処理
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// --- 従来のクリック選択の処理 ---
input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// 共通のファイル処理関数
function handleFile(file) {
    // 画像以外なら弾く
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルのみ対応しています');
        return;
    }
    currentFile = file;
    dropText.textContent = `選択中: ${currentFile.name}`;
    processImage();
}


// --- ここから下は変更なし（ラジオボタン監視・変換処理） ---

document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (currentFile) processImage();
    });
});

async function processImage() {
    if (!currentFile) return;

    metaInfo.textContent = '変換中...';
    saveBtn.classList.remove('active');
    saveBtn.style.backgroundColor = '#ccc';

    try {
        const selectedWidth = parseInt(document.querySelector('input[name="width"]:checked').value);
        const selectedQuality = parseInt(document.querySelector('input[name="quality"]:checked').value);

        const bitmap = await createImageBitmap(currentFile);
        
        let targetWidth = bitmap.width;
        let targetHeight = bitmap.height;

        if (targetWidth > selectedWidth) {
            targetHeight = Math.round(targetHeight * (selectedWidth / targetWidth));
            targetWidth = selectedWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        const webpBuffer = await encode(imageData, {
            quality: selectedQuality,
            method: 4,
        });

        const blob = new Blob([webpBuffer], { type: 'image/webp' });
        const url = URL.createObjectURL(blob);

        preview.src = url;
        preview.style.display = 'block';
        placeholderText.style.display = 'none';

        const origSize = (currentFile.size / 1024).toFixed(1);
        const newSize = (blob.size / 1024).toFixed(1);
        const reduction = Math.round((1 - blob.size / currentFile.size) * 100);

        metaInfo.innerHTML = `
            元: ${origSize} KB<br>
            ↓<br>
            <span class="size-highlight">${newSize} KB</span> (-${reduction}%)<br>
            サイズ: ${targetWidth} x ${targetHeight} px / 画質: ${selectedQuality}
        `;

        const originalName = currentFile.name.replace(/\.[^.]+$/, '');
        saveBtn.href = url;
        saveBtn.download = `${originalName}_${selectedWidth}w_q${selectedQuality}.webp`;
        saveBtn.textContent = '画像を保存する';
        saveBtn.classList.add('active');
        saveBtn.style.backgroundColor = '#007bff';

    } catch (error) {
        console.error(error);
        metaInfo.textContent = 'エラーが発生しました。別の画像を試してください。';
    }
}