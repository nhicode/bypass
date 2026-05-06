const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio'); 

const app = express();

app.use(cors());
app.use(express.json());
// Cấu hình Express phục vụ thư mục "public" chứa giao diện Web
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/bypass', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ success: false, message: 'Link không hợp lệ, phải bắt đầu bằng http hoặc https.' });
    }

    try {
        console.log(`[Server] Đang xử lý: ${url}`);
        const parsedUrl = new URL(url);
        
        // 1. Thuật toán Giải mã Tham số (Base64 & URL Decode)
        const params = ['url', 'link', 'dest', 'target', 'id'];
        for (let param of params) {
            let target = parsedUrl.searchParams.get(param);
            if (target) {
                try {
                    let decoded = Buffer.from(target, 'base64').toString('utf8');
                    if (decoded.startsWith('http')) {
                        return res.json({ success: true, result: decoded, method: 'Base64 Decode' });
                    }
                } catch (e) {}
                
                let decodedUrl = decodeURIComponent(target);
                if (decodedUrl.startsWith('http')) {
                    return res.json({ success: true, result: decodedUrl, method: 'URL Decode' });
                }
            }
        }

        // 2. Thuật toán Bắt HTTP Redirect
        const response = await axios.get(url, {
            maxRedirects: 0, 
            validateStatus: status => status >= 200 && status < 400,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });

        if (response.headers.location) {
            return res.json({ success: true, result: response.headers.location, method: 'Bắt Redirect' });
        }

        // 3. Thuật toán Cào Dữ Liệu HTML (Web Scraping)
        if (response.data && typeof response.data === 'string') {
            const $ = cheerio.load(response.data);
            
            let extractLink = $('a.skip-btn, a#continue, a.btn-success, a[href*="destination"]').attr('href');
            
            if (!extractLink) {
                const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
                if (metaRefresh) {
                    const match = metaRefresh.match(/url=(.*)/i);
                    if (match && match[1]) {
                        extractLink = match[1].replace(/['"]/g, '').trim();
                    }
                }
            }

            if (extractLink && extractLink.startsWith('http')) {
                return res.json({ success: true, result: extractLink, method: 'Cào HTML' });
            }
        }

        return res.status(404).json({ success: false, message: 'Bảo mật quá cao (Cloudflare/Captcha) hoặc thuật toán chưa hỗ trợ.' });

    } catch (error) {
        return res.status(500).json({ success: false, message: `Lỗi Server: ${error.message}` });
    }
});

// Nếu người dùng truy cập route lạ, trả về trang chủ
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Đang chạy tại cổng ${PORT}`));
