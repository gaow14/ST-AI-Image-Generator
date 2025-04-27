# SillyTavern AI图像生成器

这是一个为SillyTavern开发的AI图像生成插件，支持多种AI绘图后端，包括:

- Stable Diffusion WebUI
- NovelAI
- ComfyUI
- 免费API (pollinations.ai)

## 功能

- 自动识别聊天中的图像生成提示
- 支持多种生成模式选择
- 可自定义提示词、反向提示词
- 支持图像缓存
- 自动生成和双击生成功能

## 安装方法

### 方法一：通过URL安装
1. 打开SillyTavern，点击左侧边栏的"插件与扩展"（扳手图标）
2. 点击"安装第三方扩展"按钮
3. 在URL输入框中粘贴以下地址：
https://github.com/你的用户名/ST-AI-Image-Generator

4. 点击"安装"按钮
5. 安装完成后重启SillyTavern

### 方法二：手动安装
1. 下载此仓库的ZIP文件
2. 解压到SillyTavern的`public/scripts/extensions/third-party/`目录下
3. 确保文件夹名称为`ai-image-generator`
4. 重启SillyTavern

## 使用方法

1. 在左侧边栏点击"插件与扩展"，确保"AI图像生成器"已启用
2. 在设置中配置你想要使用的AI服务接口
3. 在聊天中使用特定格式触发图像生成，默认格式为：
image###你的提示词###

4. 点击出现的"生成图片"按钮即可生成图像

## 配置说明

### 基础设置
- 启用/禁用插件
- 选择生成模式
- 设置触发标记
- 缓存设置

### Stable Diffusion设置
- SD WebUI API地址
- 提示词增强
- 负面提示词
- 各种生成参数

### NovelAI设置
- API密钥
- 模型选择
- 生成参数

### ComfyUI设置
- API地址
- 工作流配置
- 模型选择

### 免费API设置
- 图像尺寸
- 模型选择

## 注意事项

- 使用NovelAI需要有效的API密钥
- 使用Stable Diffusion和ComfyUI需要在本地或远程服务器上运行相应的服务
- 免费API不需要额外配置，但生成质量和速度可能受限

## 常见问题

### 图像生成失败或无响应
- 检查API地址是否正确
- 确认相应的服务是否已启动
- 检查API密钥是否有效
- 查看浏览器控制台是否有错误信息

### 安装后插件不显示
- 确认插件已正确安装在正确的目录
- 重启SillyTavern
- 清除浏览器缓存

## 支持与反馈

如有问题或建议，请通过GitHub Issues提交反馈。

---

该项目基于从前跟你一样的脚本修改，感谢原作者的贡献。
