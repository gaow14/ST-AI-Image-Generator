// AI图像生成扩展 - 集成SD、NovelAI和ComfyUI

import { getContext, getApiUrl, extension_settings, saveSettingsDebounced } from '../../../script.js';
import { registerSlashCommand } from '../../slash-commands.js';
import { callPopup, notification } from '../../notification.js';

// 扩展名称，用于设置存储
const EXTENSION_NAME = 'ai_image_gen';

// 默认设置
const defaultSettings = {
    enabled: false,
    mode: 'sd',         // sd, novelai, comfyui
    sdUrl: 'http://localhost:7860',
    novelaiApi: '',
    startTag: 'image###',
    endTag: '###',
    fixedPrompt: '',
    negativePrompt: '',
    nai3Scale: '10',
    sdCfgScale: '7',
    sm: "true",
    dyn: 'true',
    cfg_rescale: '0.18',
    width: '1024',
    height: '1024',
    steps: '28',
    seed: '0',
    restoreFaces: 'false',
    samplerName: 'DPM++ 2M',
    comfyuisamplerName: 'euler_ancestral',
    sampler: "k_euler",
    zidongdianji: "true",
    nai3VibeTransfer: "false",
    dbclike: "false",
    MODEL_NAME: "模型名称",
    cache: "1"
};

// 初始化设置
function initSettings() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {};
    }

    // 使用默认值填充缺失的设置
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (extension_settings[EXTENSION_NAME][key] === undefined) {
            extension_settings[EXTENSION_NAME][key] = value;
        }
    }
}

// 保存设置
function saveSettings() {
    saveSettingsDebounced();
}

// 图片缓存对象
let imageCache = {};

// 加载缓存
function loadImageCache() {
    try {
        const cachedData = localStorage.getItem(`${EXTENSION_NAME}_cache`);
        if (cachedData) {
            imageCache = JSON.parse(cachedData);

            // 清理过期缓存
            const now = Date.now();
            const cacheTime = parseInt(extension_settings[EXTENSION_NAME].cache) * 24 * 60 * 60 * 1000;

            if (cacheTime > 0) {
                let hasExpired = false;

                for (const [key, data] of Object.entries(imageCache)) {
                    if (now - data.timestamp > cacheTime) {
                        delete imageCache[key];
                        hasExpired = true;
                    }
                }

                if (hasExpired) {
                    saveImageCache();
                }
            }
        }
    } catch (error) {
        console.error('加载图片缓存失败:', error);
        imageCache = {};
    }
}

// 保存缓存
function saveImageCache() {
    try {
        localStorage.setItem(`${EXTENSION_NAME}_cache`, JSON.stringify(imageCache));
    } catch (error) {
        console.error('保存图片缓存失败:', error);
    }
}

// 添加图片到缓存
function addImageToCache(prompt, imageData) {
    const md5 = CryptoJS.MD5(prompt).toString();
    imageCache[md5] = {
        imageData: imageData,
        timestamp: Date.now()
    };
    saveImageCache();
}

// 从缓存获取图片
function getImageFromCache(prompt) {
    const md5 = CryptoJS.MD5(prompt).toString();
    if (imageCache[md5]) {
        return imageCache[md5].imageData;
    }
    return null;
}

// 清除图片缓存
function clearImageCache() {
    imageCache = {};
    localStorage.removeItem(`${EXTENSION_NAME}_cache`);
    notification('图片缓存已清除');
}

// 生成随机种子
function generateRandomSeed() {
    return Math.floor(Math.random() * 1000000000);
}

// 处理正面提示词
function processPositivePrompt(fixedPrompt, prompt) {
    if (!fixedPrompt) {
        return prompt;
    }
    return `${fixedPrompt}, ${prompt}`;
}

// 生成SD图像
async function generateSDImage(prompt) {
    const settings = extension_settings[EXTENSION_NAME];

    // 检查缓存
    const cachedImage = getImageFromCache(prompt);
    if (cachedImage) {
        return cachedImage;
    }

    const positivePrompt = processPositivePrompt(settings.fixedPrompt, prompt);

    const payload = {
        prompt: positivePrompt,
        negative_prompt: settings.negativePrompt,
        steps: parseInt(settings.steps),
        sampler_name: settings.samplerName,
        width: parseInt(settings.width),
        height: parseInt(settings.height),
        restore_faces: settings.restoreFaces === 'true',
        cfg_scale: parseFloat(settings.sdCfgScale),
        seed: settings.seed === '0' ? -1 : parseInt(settings.seed)
    };

    try {
        const response = await fetch(`${settings.sdUrl}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const imageData = `data:image/png;base64,${data.images[0]}`;

        // 添加到缓存
        addImageToCache(prompt, imageData);

        return imageData;
    } catch (error) {
        console.error('生成SD图像失败:', error);
        notification('生成SD图像失败: ' + error.message, 'error');
        return null;
    }
}

// 生成NovelAI图像
async function generateNovelAIImage(prompt) {
    const settings = extension_settings[EXTENSION_NAME];

    // 检查缓存
    const cachedImage = getImageFromCache(prompt);
    if (cachedImage) {
        return cachedImage;
    }

    const positivePrompt = processPositivePrompt(settings.fixedPrompt, prompt);

    const payload = {
        input: positivePrompt,
        model: "nai-diffusion-3",
        action: "generate",
        parameters: {
            width: parseInt(settings.width),
            height: parseInt(settings.height),
            scale: parseFloat(settings.nai3Scale),
            sampler: settings.sampler,
            steps: parseInt(settings.steps),
            seed: settings.seed === '0' ? generateRandomSeed() : parseInt(settings.seed),
            sm: settings.sm === 'true',
            sm_dyn: settings.dyn === 'true',
            negative_prompt: settings.negativePrompt
        }
    };

    try {
        const response = await fetch('https://api.novelai.net/ai/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.novelaiApi}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // 解压ZIP获取图像
        const zip = await JSZip.loadAsync(bytes);
        let imageData = null;

        for (const filename of Object.keys(zip.files)) {
            const file = zip.files[filename];
            if (!file.dir) {
                const data = await file.async('base64');
                imageData = `data:image/png;base64,${data}`;
                break;
            }
        }

        if (imageData) {
            // 添加到缓存
            addImageToCache(prompt, imageData);
            return imageData;
        }

        throw new Error('在ZIP中找不到图像');
    } catch (error) {
        console.error('生成NovelAI图像失败:', error);
        notification('生成NovelAI图像失败: ' + error.message, 'error');
        return null;
    }
}

// 生成ComfyUI图像
async function generateComfyUIImage(prompt) {
    const settings = extension_settings[EXTENSION_NAME];

    // 检查缓存
    const cachedImage = getImageFromCache(prompt);
    if (cachedImage) {
        return cachedImage;
    }

    const positivePrompt = processPositivePrompt(settings.fixedPrompt, prompt);

    // 创建工作流
    const clientId = Math.random().toString(36).substring(2, 15);
    const workflow = {
        "3": {
            "inputs": {
                "seed": settings.seed === '0' ? generateRandomSeed() : parseInt(settings.seed),
                "steps": parseInt(settings.steps),
                "cfg": parseFloat(settings.sdCfgScale),
                "sampler_name": settings.comfyuisamplerName,
                "scheduler": "karras",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["20", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler"
        },
        "4": {
            "inputs": {
                "ckpt_name": `${settings.MODEL_NAME}.safetensors`
            },
            "class_type": "CheckpointLoaderSimple"
        },
        "5": {
            "inputs": {
                "width": parseInt(settings.width),
                "height": parseInt(settings.height),
                "batch_size": 1
            },
            "class_type": "EmptyLatentImage"
        },
        "7": {
            "inputs": {
                "text": settings.negativePrompt
            },
            "class_type": "CLIPTextEncode"
        },
        "8": {
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEDecode"
        },
        "20": {
            "inputs": {
                "text": positivePrompt
            },
            "class_type": "CLIPTextEncode"
        },
        "23": {
            "inputs": {
                "filename_prefix": "ComfyUI",
                "images": ["8", 0]
            },
            "class_type": "SaveImage"
        }
    };

    const promptData = {
        prompt: workflow,
        client_id: clientId
    };

    try {
        // 发送提示词
        const response = await fetch(`${settings.sdUrl}/prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(promptData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const promptResult = await response.json();
        const promptId = promptResult.prompt_id;

        // 轮询结果
        let imageData = null;
        let retries = 0;
        const maxRetries = 60; // 最多等待60秒

        while (!imageData && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

            const historyResponse = await fetch(`${settings.sdUrl}/history/${promptId}`);
            if (!historyResponse.ok) {
                retries++;
                continue;
            }

            const historyData = await historyResponse.json();
            if (historyData[promptId] && historyData[promptId].outputs) {
                const outputs = historyData[promptId].outputs;
                const outputKeys = Object.keys(outputs);

                if (outputKeys.length > 0) {
                    const firstOutput = outputs[outputKeys[0]];
                    if (firstOutput.images && firstOutput.images.length > 0) {
                        const filename = firstOutput.images[0].filename;

                        // 获取图像
                        const imageResponse = await fetch(`${settings.sdUrl}/view?filename=${filename}&type=output`);
                        if (imageResponse.ok) {
                            const blob = await imageResponse.blob();
                            imageData = await new Promise(resolve => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });

                            // 添加到缓存
                            addImageToCache(prompt, imageData);
                        }
                    }
                }
            }

            retries++;
        }

        if (!imageData) {
            throw new Error('生成图像超时');
        }

        return imageData;
    } catch (error) {
        console.error('生成ComfyUI图像失败:', error);
        notification('生成ComfyUI图像失败: ' + error.message, 'error');
        return null;
    }
}

// 检测聊天消息中的图像提示
function detectImagePrompts(text) {
    const settings = extension_settings[EXTENSION_NAME];
    if (!settings.enabled) return [];

    const regex = new RegExp(`${escapeRegExp(settings.startTag)}([\\s\\S]*?)${escapeRegExp(settings.endTag)}`, 'g');
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        matches.push({
            fullMatch: match[0],
            prompt: match[1].trim()
        });
    }

    return matches;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 处理聊天消息并添加图像生成按钮
async function processChatMessages() {
    if (!extension_settings[EXTENSION_NAME].enabled) return;

    const messages = document.querySelectorAll('.mes .mes_text');
    if (!messages.length) return;

    for (const message of messages) {
        // 检查消息是否已处理
        if (message.dataset.imageGenProcessed) continue;
        message.dataset.imageGenProcessed = 'true';

        const text = message.innerHTML;
        const prompts = detectImagePrompts(text);

        for (const { fullMatch, prompt } of prompts) {
            const processedPrompt = prompt.replace(/《/g, '<').replace(/》/g, '>').replace(/\n/g, ',');

            // 创建替换内容
            const buttonId = `image_gen_button_${Math.random().toString(36).substring(2, 11)}`;
            const spanId = `image_gen_span_${Math.random().toString(36).substring(2, 11)}`;

            const buttonHTML = `<button id="${buttonId}" class="ai_image_gen_button" data-prompt="${processedPrompt}">生成图片</button>`;
            const newHTML = text.replace(fullMatch, buttonHTML + `<span id="${spanId}" class="ai_image_gen_container" data-button-id="${buttonId}"></span>`);

            message.innerHTML = newHTML;

            // 添加按钮点击事件
            const button = document.getElementById(buttonId);
            const imgContainer = document.getElementById(spanId);

            if (button && imgContainer) {
                // 检查缓存中是否有图像
                const cachedImage = getImageFromCache(processedPrompt);
                if (cachedImage) {
                    displayImage(imgContainer, cachedImage, button);
                } else if (extension_settings[EXTENSION_NAME].zidongdianji === 'true') {
                    // 自动生成最新消息的图片
                    const allMessages = Array.from(document.querySelectorAll('.mes'));
                    const lastMessage = allMessages[allMessages.length - 1];

                    if (lastMessage && lastMessage.contains(message)) {
                        generateAndDisplayImage(button, imgContainer, processedPrompt);
                    }
                }

                // 添加按钮点击事件
                button.addEventListener('click', () => {
                    generateAndDisplayImage(button, imgContainer, processedPrompt);
                });

                // 添加双击事件（如果启用）
                if (extension_settings[EXTENSION_NAME].dbclike === 'true') {
                    imgContainer.addEventListener('dblclick', (event) => {
                        addSmoothShakeEffect(event.target);
                        generateAndDisplayImage(button, imgContainer, processedPrompt);
                    });

                    // 隐藏按钮
                    button.style.display = 'none';
                }
            }
        }
    }
}

// 生成并显示图像
async function generateAndDisplayImage(button, container, prompt) {
    if (!extension_settings[EXTENSION_NAME].enabled) return;

    const mode = extension_settings[EXTENSION_NAME].mode;
    button.textContent = '加载中...';
    button.disabled = true;

    let imageData = null;

    try {
        switch (mode) {
            case 'sd':
                imageData = await generateSDImage(prompt);
                break;
            case 'novelai':
                imageData = await generateNovelAIImage(prompt);
                break;
            case 'comfyui':
                imageData = await generateComfyUIImage(prompt);
                break;
            default:
                throw new Error('不支持的图像生成模式');
        }

        if (imageData) {
            displayImage(container, imageData, button);
        } else {
            throw new Error('无法生成图像');
        }
    } catch (error) {
        console.error('图像生成失败:', error);
        notification('图像生成失败: ' + error.message, 'error');
        button.textContent = '重试';
        button.disabled = false;
    }
}

// 显示图像
function displayImage(container, imageData, button) {
    if (extension_settings[EXTENSION_NAME].dbclike === 'true') {
        button.style.display = 'none';
    } else {
        button.textContent = '生成图片';
        button.disabled = false;
    }

    const img = document.createElement('img');
    img.src = imageData;
    img.alt = '生成的图像';
    img.className = 'ai_generated_image';
    img.style.maxWidth = '100%';
    img.dataset.buttonId = button.id;

    container.innerHTML = '';
    container.appendChild(img);
}

// 添加平滑震动效果
function addSmoothShakeEffect(element) {
    if (getComputedStyle(element).position === 'static') {
        element.style.position = 'relative';
    }

    const startTime = Date.now();
    const duration = 300;
    const amplitude = 3;

    function shake() {
        const elapsed = Date.now() - startTime;

        if (elapsed < duration) {
            const offset = amplitude * Math.sin(elapsed / duration * Math.PI * 10);
            element.style.left = `${offset}px`;

            requestAnimationFrame(shake);
        } else {
            element.style.left = '0px';
        }
    }

    requestAnimationFrame(shake);
}

// 添加斜杠命令
function addSlashCommands() {
    registerSlashCommand('image', (args) => {
        if (!args.trim()) {
            notification('请提供图像提示词', 'error');
            return;
        }

        const prompt = args.trim();
        const settings = extension_settings[EXTENSION_NAME];

        // 在当前消息中添加图像标记
        const textarea = document.getElementById('send_textarea');
        if (textarea) {
            const currentText = textarea.value;
            const imageTag = `${settings.startTag}${prompt}${settings.endTag}`;

            textarea.value = currentText ? `${currentText}\n${imageTag}` : imageTag;
        }
    });
}

// 添加CSS样式
function addStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .ai_image_gen_button {
            padding: 3px 4px;
            font-size: 13px;
            font-weight: 600;
            color: #ffffff;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            outline: none;
            -webkit-appearance: none;
            -moz-appearance: none;
        }

        .ai_image_gen_button:hover {
            background: linear-gradient(135deg, #5558e6 0%, #7349e3 100%);
            box-shadow: 0 6px 8px rgba(99, 102, 241, 0.3);
        }

        .ai_image_gen_button:disabled {
            background: #a3a3a3;
            cursor: not-allowed;
        }

        .ai_image_gen_container {
            display: block;
            margin-top: 10px;
            text-align: center;
        }

        .ai_generated_image {
            max-width: 100%;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);
}

// 初始化扩展
async function initExtension() {
    initSettings();
    addStyles();
    addSlashCommands();
    loadImageCache();

    // 监听新消息
    const observer = new MutationObserver((mutations) => {
        processChatMessages();
    });

    observer.observe(document.getElementById('chat') || document.body, {
        childList: true,
        subtree: true
    });

    // 处理现有消息
    await processChatMessages();

    // 创建设置UI
    createSettingsUI();
}

// 创建设置UI函数已在上方定义

// 加载扩展
jQuery(async () => {
    if (!window.CryptoJS || !window.CryptoJS.MD5) {
        // 加载 CryptoJS
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        script.onload = initExtension;
        document.head.appendChild(script);

        // 加载 JSZip
        const zipScript = document.createElement('script');
        zipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
        document.head.appendChild(zipScript);
    } else {
        await initExtension();
    }
});

// 导出函数供外部使用
export { generateSDImage, generateNovelAIImage, generateComfyUIImage };
