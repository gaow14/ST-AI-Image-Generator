```javascript
import { extension_settings, getContext, saveSettingsDebounced } from "../../../extensions.js";
import { callPopup, event_types, eventSource, saveSettingsDebounced as saveSettings } from "../../../../script.js";

// 初始化扩展名称和设置
const extensionName = 'ai_image_gen';

// 默认设置
const defaultSettings = {
enabled: false,
mode: 'sd', // sd, novelai, comfyui, free
freeMode: 'flux-anime',
cache: "1",
sdUrl: 'http://localhost:7860',
novelaiApi: '',
startTag: 'image###',
endTag: '###',
fixedPrompt: '',
nai3Scale: '10',
sdCfgScale: '7',
sm: "true",
dyn: 'true',
cfg_rescale: '0.18',
UCP: 'bad proportions, out of focus, username, text, bad anatomy, lowres, worstquality, watermark, cropped, bad body, deformed, mutated, disfigured, poorly drawn face, malformed hands, extra arms, extra limb, missing limb, too many fingers, extra legs, bad feet, missing fingers, fused fingers, acnes, floating limbs, disconnected limbs, long neck, long body, mutation, ugly, blurry, low quality, sketches, normal quality, monochrome, grayscale, signature, logo, jpeg artifacts, unfinished, displeasing, chromatic aberration, extra digits, artistic error, scan, abstract, photo, realism, screencap',
AQT: 'best quality, amazing quality, very aesthetic, absurdres',
steps: '28',
width: '1024',
height: '1024',
seed: '0',
restoreFaces: 'false',
samplerName: 'DPM++ 2M',
comfyuisamplerName: 'euler_ancestral',
sampler: "k_euler",
negativePrompt: '',
zidongdianji: "true",
nai3VibeTransfer: "false",
InformationExtracted: '0.3',
ReferenceStrength: "0.6",
nai3Deceisp: "true",
nai3Variety: "true",
Schedule: "native",
MODEL_NAME: "不带后缀例如tPonynai3_v65",
c_fenwei: "0.8",
c_xijie: "0.8",
c_idquanzhong: "1.10",
c_quanzhong: "0.8",
ipa: "STANDARD (medium strength)",
dbclike: "false",
novelaimode: "nai-diffusion-3"
};

// 确保扩展设置存在
if (!extension_settings[extensionName]) {
extension_settings[extensionName] = {};
}

// 应用默认设置
for (const [key, value] of Object.entries(defaultSettings)) {
if (!extension_settings[extensionName].hasOwnProperty(key)) {
extension_settings[extensionName][key] = value;
}
}

// 获取设置的快捷引用
const settings = extension_settings[extensionName];

// 缓存变量和工作流程状态
let xiancheng = true;
let nai3cankaotupian = "";
let comfyuicankaotupian = "";
let imagesCache = {};

// 助手函数
function escapeRegExp(string) {
return string.replace(/[.*+?^${}()|[]\]/g, '\$&');
}

function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomSeed() {
return Math.floor(Math.random() * 10000000000);
}

// 初始化插件
jQuery(async () => {
// 等待页面加载完成
await waitForElement('#extensions_settings2');

// 创建设置页面
$('#extensions_settings2').append(createSettingsHTML());

// 添加事件监听器
attachEventListeners();

// 开始定期扫描新消息
setInterval(scanMessages, 2000);

console.log('AI图像生成器插件已加载');
});

// 等待元素出现的辅助函数
function waitForElement(selector) {
return new Promise(resolve => {
if (document.querySelector(selector)) {
return resolve(document.querySelector(selector));
}

    const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
            observer.disconnect();
            resolve(document.querySelector(selector));
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
}

// 创建设置面板HTML
function createSettingsHTML() {
return `

AI图像生成器设置

启用图像生成
    <label>生成模式：
        <select id="ai_image_gen_mode">
            <option value="sd" ${settings.mode === 'sd' ? 'selected' : ''}>Stable Diffusion</option>
            <option value="novelai" ${settings.mode === 'novelai' ? 'selected' : ''}>NovelAI</option>
            <option value="comfyui" ${settings.mode === 'comfyui' ? 'selected' : ''}>ComfyUI</option>
            <option value="free" ${settings.mode === 'free' ? 'selected' : ''}>免费API</option>
        </select>
    </label><br>

    <label>开始标记：<input type="text" id="ai_image_gen_startTag" value="${settings.startTag}"></label><br>
    <label>结束标记：<input type="text" id="ai_image_gen_endTag" value="${settings.endTag}"></label><br>

    <div id="sd_settings" style="display: ${settings.mode === 'sd' ? 'block' : 'none'}">
        <h4>Stable Diffusion设置</h4>
        <label>SD URL：<input type="text" id="ai_image_gen_sdUrl" value="${settings.sdUrl}"></label><br>
        <label>提示词增强(AQT)：<input type="text" id="ai_image_gen_AQT" value="${settings.AQT}"></label><br>
        <label>负面提示词(UCP)：<input type="text" id="ai_image_gen_UCP" value="${settings.UCP}"></label><br>
        <label>固定提示词：<textarea id="ai_image_gen_fixedPrompt">${settings.fixedPrompt}</textarea></label><br>
        <label>固定负面提示词：<textarea id="ai_image_gen_negativePrompt">${settings.negativePrompt}</textarea></label><br>
        <label>CFG Scale：<input type="number" id="ai_image_gen_sdCfgScale" value="${settings.sdCfgScale}"></label><br>
        <label>步数：<input type="number" id="ai_image_gen_steps" value="${settings.steps}"></label><br>
        <label>宽度：<input type="number" id="ai_image_gen_width" value="${settings.width}"></label><br>
        <label>高度：<input type="number" id="ai_image_gen_height" value="${settings.height}"></label><br>
        <label>种子：<input type="number" id="ai_image_gen_seed" value="${settings.seed}"></label><br>
        <label>采样方式：
            <select id="ai_image_gen_samplerName">
                <option value="DPM++ 2M" ${settings.samplerName === 'DPM++ 2M' ? 'selected' : ''}>DPM++ 2M</option>
                <option value="DPM++ SDE" ${settings.samplerName === 'DPM++ SDE' ? 'selected' : ''}>DPM++ SDE</option>
                <option value="DPM++ 2M SDE" ${settings.samplerName === 'DPM++ 2M SDE' ? 'selected' : ''}>DPM++ 2M SDE</option>
                <option value="Euler a" ${settings.samplerName === 'Euler a' ? 'selected' : ''}>Euler a</option>
                <option value="Euler" ${settings.samplerName === 'Euler' ? 'selected' : ''}>Euler</option>
            </select>
        </label><br>
        <label>面部修复：
            <select id="ai_image_gen_restoreFaces">
                <option value="true" ${settings.restoreFaces === 'true' ? 'selected' : ''}>开启</option>
                <option value="false" ${settings.restoreFaces === 'false' ? 'selected' : ''}>关闭</option>
            </select>
        </label><br>
    </div>

    <div id="novelai_settings" style="display: ${settings.mode === 'novelai' ? 'block' : 'none'}">
        <h4>NovelAI设置</h4>
        <label>NovelAI API：<input type="text" id="ai_image_gen_novelaiApi" value="${settings.novelaiApi}"></label><br>
        <label>提示词增强(AQT)：<input type="text" id="ai_image_gen_AQT" value="${settings.AQT}"></label><br>
        <label>负面提示词(UCP)：<input type="text" id="ai_image_gen_UCP" value="${settings.UCP}"></label><br>
        <label>固定提示词：<textarea id="ai_image_gen_fixedPrompt">${settings.fixedPrompt}</textarea></label><br>
        <label>固定负面提示词：<textarea id="ai_image_gen_negativePrompt">${settings.negativePrompt}</textarea></label><br>
        <label>模型：
            <select id="ai_image_gen_novelaimode">
                <option value="nai-diffusion-3" ${settings.novelaimode === 'nai-diffusion-3' ? 'selected' : ''}>nai-diffusion-3</option>
                <option value="nai-diffusion-4-curated-preview" ${settings.novelaimode === 'nai-diffusion-4-curated-preview' ? 'selected' : ''}>nai-diffusion-4-curated-preview</option>
                <option value="nai-diffusion-4-full" ${settings.novelaimode === 'nai-diffusion-4-full' ? 'selected' : ''}>nai-diffusion-4-full</option>
            </select>
        </label><br>
        <label>关键词关联性：<input type="number" id="ai_image_gen_nai3Scale" value="${settings.nai3Scale}" step="0.1"></label><br>
        <label>关键词重调：<input type="number" id="ai_image_gen_cfg_rescale" value="${settings.cfg_rescale}" step="0.01"></label><br>
        <label>步数：<input type="number" id="ai_image_gen_steps" value="${settings.steps}"></label><br>
        <label>宽度：<input type="number" id="ai_image_gen_width" value="${settings.width}"></label><br>
        <label>高度：<input type="number" id="ai_image_gen_height" value="${settings.height}"></label><br>
        <label>种子：<input type="number" id="ai_image_gen_seed" value="${settings.seed}"></label><br>
        <label>采样方式：
            <select id="ai_image_gen_sampler">
                <option value="k_euler" ${settings.sampler === 'k_euler' ? 'selected' : ''}>k_euler</option>
                <option value="k_dpm_2" ${settings.sampler === 'k_dpm_2' ? 'selected' : ''}>k_dpm_2</option>
                <option value="ddim_v3" ${settings.sampler === 'ddim_v3' ? 'selected' : ''}>ddim_v3</option>
                <option value="k_dpmpp_2s_ancestral" ${settings.sampler === 'k_dpmpp_2s_ancestral' ? 'selected' : ''}>k_dpmpp_2s_ancestral</option>
                <option value="k_dpmpp_2m" ${settings.sampler === 'k_dpmpp_2m' ? 'selected' : ''}>k_dpmpp_2m</option>
                <option value="k_euler_ancestral" ${settings.sampler === 'k_euler_ancestral' ? 'selected' : ''}>k_euler_ancestral</option>
            </select>
        </label><br>
    </div>

    <div id="comfyui_settings" style="display: ${settings.mode === 'comfyui' ? 'block' : 'none'}">
        <h4>ComfyUI设置</h4>
        <label>ComfyUI URL：<input type="text" id="ai_image_gen_sdUrl" value="${settings.sdUrl}"></label><br>
        <label>提示词增强(AQT)：<input type="text" id="ai_image_gen_AQT" value="${settings.AQT}"></label><br>
        <label>负面提示词(UCP)：<input type="text" id="ai_image_gen_UCP" value="${settings.UCP}"></label><br>
        <label>固定提示词：<textarea id="ai_image_gen_fixedPrompt">${settings.fixedPrompt}</textarea></label><br>
        <label>固定负面提示词：<textarea id="ai_image_gen_negativePrompt">${settings.negativePrompt}</textarea></label><br>
        <label>步数：<input type="number" id="ai_image_gen_steps" value="${settings.steps}"></label><br>
        <label>宽度：<input type="number" id="ai_image_gen_width" value="${settings.width}"></label><br>
        <label>高度：<input type="number" id="ai_image_gen_height" value="${settings.height}"></label><br>
        <label>种子：<input type="number" id="ai_image_gen_seed" value="${settings.seed}"></label><br>
        <label>CFG Scale：<input type="number" id="ai_image_gen_sdCfgScale" value="${settings.sdCfgScale}"></label><br>
        <label>采样方式：
            <select id="ai_image_gen_comfyuisamplerName">
                <option value="euler" ${settings.comfyuisamplerName === 'euler' ? 'selected' : ''}>euler</option>
                <option value="euler_ancestral" ${settings.comfyuisamplerName === 'euler_ancestral' ? 'selected' : ''}>euler_ancestral</option>
                <option value="dpmpp_2s_ancestral" ${settings.comfyuisamplerName === 'dpmpp_2s_ancestral' ? 'selected' : ''}>dpmpp_2s_ancestral</option>
                <option value="dpmpp_2m_sde" ${settings.comfyuisamplerName === 'dpmpp_2m_sde' ? 'selected' : ''}>dpmpp_2m_sde</option>
            </select>
        </label><br>
        <label>模型文件名：<input type="text" id="ai_image_gen_MODEL_NAME" value="${settings.MODEL_NAME}"></label><br>
    </div>

    <div id="free_settings" style="display: ${settings.mode === 'free' ? 'block' : 'none'}">
        <h4>免费API设置</h4>
        <label>提示词增强(AQT)：<input type="text" id="ai_image_gen_AQT" value="${settings.AQT}"></label><br>
        <label>负面提示词(UCP)：<input type="text" id="ai_image_gen_UCP" value="${settings.UCP}"></label><br>
        <label>固定提示词：<textarea id="ai_image_gen_fixedPrompt">${settings.fixedPrompt}</textarea></label><br>
        <label>固定负面提示词：<textarea id="ai_image_gen_negativePrompt">${settings.negativePrompt}</textarea></label><br>
        <label>宽度：<input type="number" id="ai_image_gen_width" value="${settings.width}"></label><br>
        <label>高度：<input type="number" id="ai_image_gen_height" value="${settings.height}"></label><br>
        <label>免费模型：
            <select id="ai_image_gen_freeMode">
                <option value="flux-anime" ${settings.freeMode === 'flux-anime' ? 'selected' : ''}>flux-anime</option>
                <option value="anything-v3" ${settings.freeMode === 'anything-v3' ? 'selected' : ''}>anything-v3</option>
            </select>
        </label><br>
    </div>

    <br>
    <label>缓存时间：
        <select id="ai_image_gen_cache">
            <option value="0" ${settings.cache === '0' ? 'selected' : ''}>不缓存</option>
            <option value="1" ${settings.cache === '1' ? 'selected' : ''}>缓存一天</option>
            <option value="7" ${settings.cache === '7' ? 'selected' : ''}>缓存一星期</option>
            <option value="30" ${settings.cache === '30' ? 'selected' : ''}>缓存一个月</option>
            <option value="365" ${settings.cache === '365' ? 'selected' : ''}>缓存一年</option>
        </select>
    </label><br>

    <label>自动点击生成:
        <select id="ai_image_gen_zidongdianji">
            <option value="true" ${settings.zidongdianji === 'true' ? 'selected' : ''}>开启</option>
            <option value="false" ${settings.zidongdianji === 'false' ? 'selected' : ''}>关闭</option>
        </select>
    </label><br>

    <label>双击图片触发生成:
        <select id="ai_image_gen_dbclike">
            <option value="true" ${settings.dbclike === 'true' ? 'selected' : ''}>开启</option>
            <option value="false" ${settings.dbclike === 'false' ? 'selected' : ''}>关闭</option>
        </select>
    </label><br>

    <button id="ai_image_gen_clear_cache">清除图片缓存</button>
    <button id="ai_image_gen_save">保存设置</button>
    <p>提示：当你在聊天中使用 ${settings.startTag}提示词${settings.endTag} 格式时，将会触发图像生成</p>
</div>
`;
}

// 添加事件监听器
function attachEventListeners() {
// 模式切换
$('#ai_image_gen_mode').on('change', function() {
const mode = $(this).val();
$('#sd_settings, #novelai_settings, #comfyui_settings, #free_settings').hide();
$(#${mode}_settings).show();
settings.mode = mode;
saveSettings();
});

// 启用开关
$('#ai_image_gen_enabled').on('change', function() {
    settings.enabled = $(this).prop('checked');
    saveSettings();
});

// 保存按钮
$('#ai_image_gen_save').on('click', function() {
    // 保存所有设置
    settings.startTag = $('#ai_image_gen_startTag').val();
    settings.endTag = $('#ai_image_gen_endTag').val();
    settings.sdUrl = $('#ai_image_gen_sdUrl').val();
    settings.novelaiApi = $('#ai_image_gen_novelaiApi').val();
    settings.AQT = $('#ai_image_gen_AQT').val();
    settings.UCP = $('#ai_image_gen_UCP').val();
    settings.fixedPrompt = $('#ai_image_gen_fixedPrompt').val();
    settings.negativePrompt = $('#ai_image_gen_negativePrompt').val();
    settings.steps = $('#ai_image_gen_steps').val();
    settings.width = $('#ai_image_gen_width').val();
    settings.height = $('#ai_image_gen_height').val();
    settings.seed = $('#ai_image_gen_seed').val();
    settings.sdCfgScale = $('#ai_image_gen_sdCfgScale').val();
    settings.samplerName = $('#ai_image_gen_samplerName').val();
    settings.comfyuisamplerName = $('#ai_image_gen_comfyuisamplerName').val();
    settings.sampler = $('#ai_image_gen_sampler').val();
    settings.restoreFaces = $('#ai_image_gen_restoreFaces').val();
    settings.MODEL_NAME = $('#ai_image_gen_MODEL_NAME').val();
    settings.novelaimode = $('#ai_image_gen_novelaimode').val();
    settings.nai3Scale = $('#ai_image_gen_nai3Scale').val();
    settings.cfg_rescale = $('#ai_image_gen_cfg_rescale').val();
    settings.freeMode = $('#ai_image_gen_freeMode').val();
    settings.cache = $('#ai_image_gen_cache').val();
    settings.zidongdianji = $('#ai_image_gen_zidongdianji').val();
    settings.dbclike = $('#ai_image_gen_dbclike').val();

    saveSettings();
    callPopup('设置已保存', 'info');
});

// 清除缓存按钮
$('#ai_image_gen_clear_cache').on('click', function() {
    clearImageCache();
    callPopup('图片缓存已清除', 'info');
});
}

// 清除图片缓存
function clearImageCache() {
imagesCache = {};
localStorage.removeItem('ai_image_gen_cache');
console.log('图片缓存已清除');
}

// 检查图片缓存
function checkImageCache(prompt) {
// 如果禁用缓存，返回null
if (settings.cache === '0') return null;

// 从localStorage加载缓存
try {
    const cachedData = localStorage.getItem('ai_image_gen_cache');
    if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (cache[prompt]) {
            const cacheTime = cache[prompt].timestamp;
            const now = Date.now();
            const cacheDays = parseInt(settings.cache);
            const dayInMs = 24 * 60 * 60 * 1000;

            if (now - cacheTime < cacheDays * dayInMs) {
                console.log('使用缓存的图片');
                return cache[prompt].url;
            }
        }
    }
} catch (error) {
    console.error('读取缓存失败:', error);
}

return null;
}

// 保存图片到缓存
function saveImageToCache(prompt, imageUrl) {
if (settings.cache === '0') return;

try {
    let cache = {};
    const cachedData = localStorage.getItem('ai_image_gen_cache');
    if (cachedData) {
        cache = JSON.parse(cachedData);
    }

    cache[prompt] = {
        url: imageUrl,
        timestamp: Date.now()
    };

    localStorage.setItem('ai_image_gen_cache', JSON.stringify(cache));
    console.log('图片已保存到缓存');
} catch (error) {
    console.error('保存缓存失败:', error);
}
}

// 处理正面提示词组合
async function combinePositivePrompt(customPrompt, fixedPrompt, AQT) {
let result = '';

if (fixedPrompt && fixedPrompt.trim() !== '') {
    result += fixedPrompt.trim();
}

if (customPrompt && customPrompt.trim() !== '') {
    if (result !== '') result += ', ';
    result += customPrompt.trim();
}

if (AQT && AQT.trim() !== '') {
    if (result !== '') result += ', ';
    result += AQT.trim();
}

return result;
}

// 处理负面提示词组合
async function combineNegativePrompt(negativePrompt, UCP) {
let result = '';

if (negativePrompt && negativePrompt.trim() !== '') {
    result += negativePrompt.trim();
}

if (UCP && UCP.trim() !== '') {
    if (result !== '') result += ', ';
    result += UCP.trim();
}

return result;
}

// 扫描消息寻找图像生成标记
function scanMessages() {
if (!settings.enabled) return;

// 查找所有聊天消息
const messages = document.querySelectorAll('.mes_text');

messages.forEach(message => {
    // 如果消息已经处理过，跳过
    if (message.dataset.aiImgProcessed) return;
    message.dataset.aiImgProcessed = 'true';

    const content = message.innerHTML;
    // 寻找图像生成标记
    const regex = new RegExp(`${escapeRegExp(settings.startTag)}([\\s\\S]*?)${escapeRegExp(settings.endTag)}`, 'g');

    // 替换所有匹配项
    let newContent = content;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const fullMatch = match[0];
        const prompt = match[1].trim();

        // 创建唯一ID
        const buttonId = `img_btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const imgSpanId = `img_span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 创建替换HTML
        const buttonHtml = `
            <button id="${buttonId}" class="ai-image-gen-button" data-prompt="${prompt.replaceAll('"', '"')}" data-span="${imgSpanId}">生成图片</button>
            <span id="${imgSpanId}" class="ai-image-gen-result"></span>
        `;

        // 替换内容
        newContent = newContent.replace(fullMatch, buttonHtml);
    }

    // 如果内容有变化，更新DOM
    if (newContent !== content) {
        message.innerHTML = newContent;

        // 为新按钮添加事件
        message.querySelectorAll('.ai-image-gen-button').forEach(button => {
            if (!button.dataset.hasEvent) {
                button.dataset.hasEvent = 'true';

                // 添加点击事件
                button.addEventListener('click', async function() {
                    const prompt = this.dataset.prompt;
                    const spanId = this.dataset.span;
                    await handleImageGeneration(this, prompt, spanId);
                });

                // 如果开启了自动生成
                if (settings.zidongdianji === 'true') {
                    const lastMessage = Array.from(messages).pop();
                    if (message === lastMessage) {
                        setTimeout(() => button.click(), 500); // 稍微延迟一下自动点击
                    }
                }
            }
        });
    }
});
}

// 处理图像生成
async function handleImageGeneration(button, prompt, spanId) {
prompt = prompt.replaceAll("《","<").replaceAll("》",">").replaceAll("\n",",");

button.textContent = '生成中...';
button.disabled = true;

// 检查缓存
const cacheKey = prompt;
const cachedImage = checkImageCache(cacheKey);

if (cachedImage) {
    displayGeneratedImage(button, spanId, cachedImage);
    return;
}

// 基于模式生成图像
let imageUrl = null;
try {
    switch(settings.mode) {
        case 'sd':
            imageUrl = await generateWithSD(prompt);
            break;
        case 'novelai':
            imageUrl = await generateWithNovelAI(prompt);
            break;
        case 'comfyui':
            imageUrl = await generateWithComfyUI(prompt);
            break;
        case 'free':
            imageUrl = await generateWithFreeAPI(prompt);
            break;
    }

    if (imageUrl) {
        // 保存到缓存
        saveImageToCache(prompt, imageUrl);
        // 显示生成的图像
        displayGeneratedImage(button, spanId, imageUrl);
    } else {
        button.textContent = '生成失败';
        button.disabled = false;
    }
} catch (error) {
    console.error('图像生成失败:', error);
    button.textContent = '生成失败';
    button.disabled = false;
}
}
    // 显示生成的图像
    function displayGeneratedImage(button, spanId, imageUrl) {
        const span = document.getElementById(spanId);

        // 创建图像元素
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '生成的图像';
        img.style.maxWidth = '100%';

        // 清空span内容并添加图像
        span.innerHTML = '';
        span.appendChild(img);

        // 如果设置了双击触发，隐藏按钮
        if (settings.dbclike === 'true') {
            button.style.display = 'none';

            // 为图片添加双击事件
            img.addEventListener('dblclick', function() {
                // 添加震动效果提示
                addSmoothShakeEffect(img);
                // 重新生成图片
                handleImageGeneration(button, button.dataset.prompt, spanId);
            });
        } else {
            button.textContent = '重新生成';
            button.disabled = false;
        }
    }

    // 为图片添加平滑震动效果
    function addSmoothShakeEffect(imgElement) {
        // 确保图片有定位属性
        const currentPosition = window.getComputedStyle(imgElement).position;
        if (currentPosition === 'static') {
            imgElement.style.position = 'relative';
        }

        const startTime = Date.now();
        const duration = 300; // 持续时间（毫秒）
        const amplitude = 3; // 震动幅度

        function shake() {
            const elapsed = Date.now() - startTime;

            if (elapsed < duration) {
                // 使用正弦函数创建震动效果
                const offset = amplitude * Math.sin(elapsed / duration * Math.PI * 10);
                imgElement.style.left = `${offset}px`;

                requestAnimationFrame(shake);
            } else {
                // 重置位置
                imgElement.style.left = '0px';
            }
        }

        requestAnimationFrame(shake);
    }

    // 免费API图像生成
    async function generateWithFreeAPI(prompt) {
        console.log('使用免费API生成图像:', prompt);

        try {
            const width = settings.width;
            const height = settings.height;
            const seed = settings.seed === '0' ? generateRandomSeed() : Number(settings.seed);

            // 组合提示词
            const fullPrompt = await combinePositivePrompt(prompt, settings.fixedPrompt, settings.AQT);

            // 构建Pollinations.ai URL
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&seed=${seed}&model=${settings.freeMode}`;

            console.log('生成图像URL:', url);
            return url;
        } catch (error) {
            console.error('免费API生成失败:', error);
            return null;
        }
    }

    // Stable Diffusion图像生成
    async function generateWithSD(prompt) {
        console.log('使用SD生成图像:', prompt);

        if (xiancheng === false) {
            console.log('SD生成器繁忙，请稍后再试');
            return null;
        }

        try {
            xiancheng = false;

            // 组合提示词
            const fullPrompt = await combinePositivePrompt(prompt, settings.fixedPrompt, settings.AQT);
            const negPrompt = await combineNegativePrompt(settings.negativePrompt, settings.UCP);

            // 确保URL格式正确
            const sdUrl = settings.sdUrl.endsWith('/') ? settings.sdUrl.slice(0, -1) : settings.sdUrl;

            // 构建请求参数
            const payload = {
                prompt: fullPrompt,
                negative_prompt: negPrompt,
                steps: Number(settings.steps),
                sampler_name: settings.samplerName,
                width: Number(settings.width),
                height: Number(settings.height),
                restore_faces: settings.restoreFaces === 'true',
                cfg_scale: Number(settings.sdCfgScale),
                seed: settings.seed === '0' ? -1 : Number(settings.seed)
            };

            console.log('SD请求参数:', payload);

            // 发送请求到SD API
            const response = await fetch(`${sdUrl}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`SD API返回错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            xiancheng = true;

            // 返回第一张图片
            if (data.images && data.images.length > 0) {
                return 'data:image/png;base64,' + data.images[0];
            } else {
                throw new Error('SD API没有返回图片');
            }
        } catch (error) {
            console.error('SD生成失败:', error);
            xiancheng = true;
            return null;
        }
    }

    // NovelAI图像生成
    async function generateWithNovelAI(prompt) {
        console.log('使用NovelAI生成图像:', prompt);

        if (xiancheng === false) {
            console.log('NovelAI生成器繁忙，请稍后再试');
            return null;
        }

        if (!settings.novelaiApi || settings.novelaiApi.trim() === '') {
            console.error('NovelAI API密钥未设置');
            return null;
        }

        try {
            xiancheng = false;

            // 组合提示词
            const fullPrompt = await combinePositivePrompt(prompt, settings.fixedPrompt, settings.AQT);
            const negPrompt = await combineNegativePrompt(settings.negativePrompt, settings.UCP);

            // 构建NovelAI参数
            const seed = settings.seed === '0' ? generateRandomSeed() : Number(settings.seed);

            const params = {
                params_version: 3,
                width: Number(settings.width),
                height: Number(settings.height),
                scale: Number(settings.nai3Scale),
                sampler: settings.sampler,
                steps: Number(settings.steps),
                n_samples: 1,
                ucPreset: 3,
                qualityToggle: true,
                sm: settings.sm === 'true',
                sm_dyn: settings.dyn === 'true' && settings.sm === 'true',
                dynamic_thresholding: settings.nai3Deceisp === 'true',
                controlnet_strength: 1,
                legacy: false,
                add_original_image: false,
                cfg_rescale: Number(settings.cfg_rescale),
                noise_schedule: settings.Schedule,
                skip_cfg_above_sigma: settings.nai3Variety === 'true' ? 19.343056794463642 : null,
                legacy_v3_extend: false,
                seed: seed,
                negative_prompt: negPrompt,
                reference_image_multiple: [],
                reference_information_extracted_multiple: [],
                reference_strength_multiple: []
            };

            // 添加参考图片（如果有）
            if (nai3cankaotupian && settings.nai3VibeTransfer === 'true') {
                params.reference_image_multiple.push(nai3cankaotupian.split(',')[1]);
                params.reference_information_extracted_multiple.push(Number(settings.InformationExtracted));
                params.reference_strength_multiple.push(Number(settings.ReferenceStrength));
            }

            // 根据选择的模型添加特殊参数
            if (settings.novelaimode === 'nai-diffusion-4-curated-preview' || settings.novelaimode === 'nai-diffusion-4-full') {
                // NAI V4需要特殊的参数
                params.v4_prompt = {
                    caption: {
                        base_caption: fullPrompt,
                        char_captions: []
                    },
                    use_coords: false,
                    use_order: true
                };

                params.v4_negative_prompt = {
                    caption: {
                        base_caption: negPrompt,
                        char_captions: []
                    }
                };
            }

            // 发送请求到NovelAI API
            const response = await fetch('https://image.novelai.net/ai/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.novelaiApi}`
                },
                body: JSON.stringify({
                    input: fullPrompt,
                    model: settings.novelaimode,
                    action: 'generate',
                    parameters: params
                })
            });

            if (!response.ok) {
                let errorMessage = `NovelAI API返回错误: ${response.status}`;
                if (response.status === 401) {
                    errorMessage = 'NovelAI API密钥无效';
                } else if (response.status === 402) {
                    errorMessage = 'NovelAI账户余额不足';
                }
                throw new Error(errorMessage);
            }

            // NovelAI返回的是ZIP文件，包含图片
            const zipData = await response.arrayBuffer();
            const unzippedData = await unzipNovelAIResponse(zipData);

            xiancheng = true;
            return unzippedData;
        } catch (error) {
            console.error('NovelAI生成失败:', error);
            xiancheng = true;
            return null;
        }
    }

    // 解压NovelAI响应
    async function unzipNovelAIResponse(zipData) {
        return new Promise((resolve, reject) => {
            try {
                // 加载ZIP数据
                JSZip.loadAsync(zipData)
                    .then(function(zip) {
                        // 遍历ZIP文件
                        zip.forEach(function(relativePath, zipEntry) {
                            // 获取第一个文件（应该是PNG图片）
                            zipEntry.async('base64').then(function(base64Data) {
                                resolve('data:image/png;base64,' + base64Data);
                            });
                        });
                    })
                    .catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ComfyUI图像生成
    async function generateWithComfyUI(prompt) {
        console.log('使用ComfyUI生成图像:', prompt);

        if (xiancheng === false) {
            console.log('ComfyUI生成器繁忙，请稍后再试');
            return null;
        }

        try {
            xiancheng = false;

            // 处理提示词
            prompt = prompt.replaceAll("《","<").replaceAll("》",">").replaceAll("\n",",");

            // 组合提示词
            const fullPrompt = await combinePositivePrompt(prompt, settings.fixedPrompt, settings.AQT);
            const negPrompt = await combineNegativePrompt(settings.negativePrompt, settings.UCP);

            // 替换LORA标签格式
            const replaceLoraTags = (input) => {
                const regex = /<lora:([^:]+)(?:\.safetensors)?:([^>]+)(?::1)?>/g;
                return input.replace(regex, (match, filename, value) => {
                    if (match.includes('.safetensors')) {
                        return match;
                    }
                    return `<lora:${filename}.safetensors:${value}:1>`;
                });
            };

            let processedPrompt = replaceLoraTags(fullPrompt);
            let processedNegPrompt = replaceLoraTags(negPrompt);

            // 处理字符串以适应ComfyUI格式
            processedPrompt = processedPrompt.replaceAll("\n",",").replaceAll("\\\\","\\").replaceAll("\\","\\\\");
            processedNegPrompt = processedNegPrompt.replaceAll("\n",",").replaceAll("\\\\","\\").replaceAll("\\","\\\\");

            // 确保URL格式正确
            const comfyUrl = settings.sdUrl.endsWith('/') ? settings.sdUrl.slice(0, -1) : settings.sdUrl;
            // 使用8188端口而不是7860
            const apiUrl = comfyUrl.replace('7860', '8188');

            // 生成客户端ID
            const clientId = `ai_img_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 获取工作流模板
            let workflow = await getComfyUIWorkflow();

            // 替换模板中的变量
            const seed = settings.seed === '0' ? generateRandomSeed() : Number(settings.seed);
            workflow = workflow
                .replace("%seed%", seed)
                .replace("%steps%", Number(settings.steps))
                .replace("%cfg_scale%", Number(settings.sdCfgScale))
                .replace("%sampler_name%", `"${settings.comfyuisamplerName}"`)
                .replace("%width%", Number(settings.width))
                .replace("%height%", Number(settings.height))
                .replace("%negative_prompt%", `"${processedNegPrompt}"`)
                .replace("%prompt%", `"${processedPrompt}"`)
                .replace("%MODEL_NAME%", `"${settings.MODEL_NAME.trim()}.safetensors"`)
                .replace("%c_quanzhong%", Number(settings.c_quanzhong))
                .replace("%c_idquanzhong%", Number(settings.c_idquanzhong))
                .replace("%c_xijie%", Number(settings.c_xijie))
                .replace("%c_fenwei%", Number(settings.c_fenwei));

            if (comfyuicankaotupian) {
                workflow = workflow.replace("%comfyuicankaotupian%", `"${comfyuicankaotupian}"`);
            }

            workflow = workflow.replace("%ipa%", `"${settings.ipa}"`);

            // 构建ComfyUI请求
            const comfyPayload = {
                client_id: clientId,
                prompt: JSON.parse(workflow)
            };

            // 发送请求到ComfyUI
            const response = await fetch(`${apiUrl}/prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(comfyPayload)
            });

            if (!response.ok) {
                throw new Error(`ComfyUI API返回错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const promptId = data.prompt_id;

            // 等待图像生成完成
            let imageUrl = null;
            let retryCount = 0;

            while (retryCount < 60) { // 最多等待60秒
                await sleep(1000);
                retryCount++;

                // 检查生成状态
                const historyResponse = await fetch(`${apiUrl}/history/${promptId}`);
                if (!historyResponse.ok) continue;

                const historyData = await historyResponse.json();

                if (historyData[promptId]) {
                    // 查找输出图像
                    const outputs = historyData[promptId].outputs;
                    if (!outputs) continue;

                    // 查找第一个有图像的输出
                    const outputKeys = Object.keys(outputs);
                    for (const key of outputKeys) {
                        const output = outputs[key];
                        if (output.images && output.images.length > 0) {
                            const filename = output.images[0].filename;
                            imageUrl = `${apiUrl}/view?filename=${filename}&type=output`;
                            break;
                        }
                    }

                    if (imageUrl) break;
                }
            }

            if (!imageUrl) {
                throw new Error('ComfyUI生成超时');
            }

            // 获取图像
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`获取ComfyUI图像失败: ${imageResponse.status}`);
            }

            const imageBlob = await imageResponse.blob();
            const dataUrl = await blobToDataURL(imageBlob);

            xiancheng = true;
            return dataUrl;
        } catch (error) {
            console.error('ComfyUI生成失败:', error);
            xiancheng = true;
            return null;
        }
    }

    // 获取ComfyUI工作流
    async function getComfyUIWorkflow() {
        // 这里可以扩展为从设置中获取不同的工作流模板
        // 为简化，这里返回一个基本的工作流
        return `{
            "3": {
                "inputs": {
                    "seed": "%seed%",
                    "steps": "%steps%",
                    "cfg": "%cfg_scale%",
                    "sampler_name": "%sampler_name%",
                    "scheduler": "karras",
                    "denoise": 1,
                    "model": [
                        "4",
                        0
                    ],
                    "positive": [
                        "5",
                        0
                    ],
                    "negative": [
                        "6",
                        0
                    ],
                    "latent_image": [
                        "7",
                        0
                    ]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler"
                }
            },
            "4": {
                "inputs": {
                    "ckpt_name": "%MODEL_NAME%"
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {
                    "title": "Checkpoint Loader"
                }
            },
            "5": {
                "inputs": {
                    "text": "%prompt%",
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Positive)"
                }
            },
            "6": {
                "inputs": {
                    "text": "%negative_prompt%",
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Negative)"
                }
            },
            "7": {
                "inputs": {
                    "width": "%width%",
                    "height": "%height%",
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage",
                "_meta": {
                    "title": "Empty Latent Image"
                }
            },
            "8": {
                "inputs": {
                    "samples": [
                        "3",
                        0
                    ],
                    "vae": [
                        "4",
                        2
                    ]
                },
                "class_type": "VAEDecode",
                "_meta": {
                    "title": "VAE Decode"
                }
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage",
                "_meta": {
                    "title": "Save Image"
                }
            }
        }`;
    }

    // Blob转DataURL
    function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.onerror = function(e) {
                reject(e);
            };
            reader.readAsDataURL(blob);
        });
    }

    // JSZip 可能需要在HTML中单独引入
    // 如果没有在全局作用域中找到JSZip，可以尝试使用以下代替方法
    function getJSZip() {
        if (typeof JSZip !== 'undefined') {
            return JSZip;
        }

        // 这里可以添加动态加载JSZip的代码
        // 或者在插件安装时确保JSZip已经加载
        throw new Error('JSZip未找到，可能需要在插件设置中单独引入');
    }
}
