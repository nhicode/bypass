const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio'); // Thư viện dùng để cào HTML (Scraping)

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ĐÂY LÀ API RIÊNG CỦA BẠN - BẠN LÀ CHỦ SỞ HỮU
app.post('/api/bypass', async (req, res) => {
    const { url } = req.body;
    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ success: false, message: 'Link không hợp lệ.' });
    }

    try {
        console.log(`[Hệ thống của bạn] Đang xử lý: ${url}`);
        const parsedUrl = new URL(url);
        
        // ==========================================
        // THUẬT TOÁN 1: GIẢI MÃ THAM SỐ (BASE64 & URL ENCODE)
        // Dùng cho các trang giấu link thật ở trên URL (VD: ?url=aHR0cHM...)
        // ==========================================
        const params = ['url', 'link', 'dest', 'target'];
        for (let param of params) {
            let target = parsedUrl.searchParams.get(param);
            if (target) {
                try {
                    // Thử giải mã Base64
                    let decoded = Buffer.from(target, 'base64').toString('utf8');
                    if (decoded.startsWith('http')) return res.json({ success: true, result: decoded, method: 'Base64 Decode' });
                } catch (e) {}
                
                // Thử giải mã URL Encode thường
                let decodedUrl = decodeURIComponent(target);
                if (decodedUrl.startsWith('http')) return res.json({ success: true, result: decodedUrl, method: 'URL Decode' });
            }
        }

        // ==========================================
        // THUẬT TOÁN 2: BẮT LINK CHUYỂN HƯỚNG (HTTP REDIRECT)
        // Dùng cho các trang click vào là tự động văng sang trang khác
        // ==========================================
        const response = await axios.get(url, {
            maxRedirects: 0, // Cấm nó tự chuyển trang để mình bắt tận tay
            validateStatus: status => status >= 200 && status < 400,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
        });

        if (response.headers.location) {
            return res.json({ success: true, result: response.headers.location, method: 'Bắt Redirect Trực Tiếp' });
        }

        // ==========================================
        // THUẬT TOÁN 3: CÀO DỮ LIỆU HTML (WEB SCRAPING)
        // Dùng cho các trang giấu link trong mã HTML hoặc thẻ Meta
        // ==========================================
        if (response.data && typeof response.data === 'string') {
            const $ = cheerio.load(response.data);
            
            // Tìm các thẻ <a> có class chứa chữ 'skip', 'continue', 'btn'
            let extractLink = $('a.skip-btn, a#continue, a[href*="destination"]').attr('href');
            
            if (!extractLink) {
                // Thử tìm trong thẻ <meta http-equiv="refresh"> (Trang tự động load lại)
                const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
                if (metaRefresh) {
                    const match = metaRefresh.match(/url=(.*)/i);
                    if (match && match[1]) extractLink = match[1].replace(/['"]/g, '');
                }
            }

            if (extractLink && extractLink.startsWith('http')) {
                return res.json({ success: true, result: extractLink, method: 'Cào mã HTML' });
            }
        }

        // Nếu cả 3 thuật toán đều bó tay (Do có Captcha hoặc Cloudflare quá mạnh)
        return res.status(404).json({ success: false, message: 'Thuật toán hiện tại chưa hỗ trợ trang này hoặc trang có Cloudflare/Captcha.' });

    } catch (error) {
        return res.status(500).json({ success: false, message: `Lỗi Server của bạn: ${error.message}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Hệ thống] Server đang chạy ở cổng ${PORT}`));
