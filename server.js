const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();

// Cấu hình Middleware
app.use(cors());
app.use(express.json());

// Cho phép Node.js phục vụ các file tĩnh (HTML, CSS) từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint xử lý Bypass
app.post('/api/bypass', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập link hợp lệ (http/https).' });
    }

    console.log(`[BMad Server] Đang xử lý liên kết: ${url}`);

    try {
        // BƯỚC 1: Phân tích URL để tìm chuỗi mã hóa (Base64) ẩn trong tham số
        const parsedUrl = new URL(url);
        const searchParams = parsedUrl.searchParams;
        const possibleParams = ['url', 'link', 'dest', 'target', 'id'];
        
        let targetParam = null;
        for (let param of possibleParams) {
            if (searchParams.has(param)) {
                targetParam = searchParams.get(param);
                break;
            }
        }

        if (targetParam) {
            // Thử giải mã Base64
            try {
                const decodedText = Buffer.from(targetParam, 'base64').toString('utf8');
                if (decodedText.startsWith('http')) {
                    return res.json({ success: true, result: decodedText, method: 'Base64 Decode' });
                }
            } catch (e) {
                // Thử giải mã URL Encode thông thường
                const decodedUrl = decodeURIComponent(targetParam);
                if (decodedUrl.startsWith('http')) {
                    return res.json({ success: true, result: decodedUrl, method: 'URL Decode' });
                }
            }
        }

        // BƯỚC 2: Nếu không có mã hóa, dùng Axios kết nối thẳng để xem nó chuyển hướng (Redirect) đi đâu
        const response = await axios.get(url, {
            maxRedirects: 0, // Chặn tự động chuyển hướng để bắt lấy link đích
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Cho phép mã 3xx (Redirect) lọt qua
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Bắt lấy link đích từ Header 'Location' (rất phổ biến ở các trang rút gọn)
        if (response.headers.location) {
            return res.json({ success: true, result: response.headers.location, method: 'HTTP Redirect Catch' });
        }

        // BƯỚC 3: Rút trích nội dung trang web nếu link nằm trong HTML
        const htmlData = response.data;
        const linkRegex = /(?:href|window\.location\.replace\()=['"](https?:\/\/[^'"]+)['"]/i;
        const match = typeof htmlData === 'string' ? htmlData.match(linkRegex) : null;

        if (match && match[1]) {
            return res.json({ success: true, result: match[1], method: 'HTML Regex Extraction' });
        }

        // Nếu tất cả các phương pháp thất bại
        return res.status(404).json({ success: false, message: 'Hệ thống bảo mật quá cao (có thể do Cloudflare Captcha), không thể tự động bóc tách link.' });

    } catch (error) {
        console.error("[BMad Server] Lỗi:", error.message);
        res.status(500).json({ success: false, message: 'Lỗi khi phân giải liên kết. Máy chủ đích có thể đã chặn kết nối.' });
    }
});

// Chuyển hướng mọi Request khác về giao diện Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động máy chủ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[BMad Server] Đã sẵn sàng tại http://localhost:${PORT}`);
});
