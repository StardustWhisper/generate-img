const express = require('express');
const cors = require('cors');
const axios = require('axios');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const app = express();

// 安全性和性能中间件
app.use(helmet({
    contentSecurityPolicy: false // 如果需要的话可以配置 CSP
}));
app.use(compression()); // 启用 Gzip 压缩

// CORS 配置
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.post('/api/generate-image', async (req, res) => {
    try {
        const { 
            prompt, 
            negative_prompt = "",
            apiKey, 
            model = "black-forest-labs/FLUX.1-schnell", 
            imageSize = "1024x1024",
            guidanceScale = 7.5,
            inferenceSteps = 10,
            seed = 0
        } = req.body;
        
        if (!prompt || !apiKey) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        const requestBody = {
            model: model,
            prompt: prompt,
            negative_prompt: negative_prompt,
            image_size: imageSize,
            guidance_scale: guidanceScale,
            num_inference_steps: inferenceSteps,
            seed: seed
        };

        const response = await axios.post(
            'https://api.siliconflow.cn/v1/image/generations',
            requestBody,
            config
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: '生成图片失败',
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/download-image', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        const fileName = req.query.fileName || 'image.png';

        if (!imageUrl) {
            return res.status(400).json({ error: '缺少图片URL参数' });
        }

        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        response.data.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: '下载图片失败',
            details: error.message
        });
    }
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: '服务器错误',
        message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
    });
});

// 处理所有其他路由，返回主页
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
}); 