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
                        button.click();
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
            imageUrl = await
