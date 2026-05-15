const DB_URL = "https://noitu-5f24c-default-rtdb.firebaseio.com/posts.json";

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("post-container");
    const loading = document.getElementById("loading");

    try {
        // Gửi HTTP GET request tới Firebase
        const response = await fetch(DB_URL);
        const data = await response.json();

        if (data) {
            loading.remove();
            // Firebase trả về Object, ta chuyển thành Array và đảo ngược để bài mới lên đầu
            const postsArray = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();

            postsArray.forEach(post => {
                const postElement = document.createElement("article");
                postElement.classList.add("post");

                postElement.innerHTML = `
                    <div class="post-header">
                        <h2>${post.title}</h2>
                        <button class="copy-btn" data-content="${encodeURIComponent(post.content)}">Copy Code</button>
                    </div>
                    <pre><code class="language-${post.language}">${escapeHTML(post.content)}</code></pre>
                `;
                container.appendChild(postElement);
            });

            // Kích hoạt tô màu code
            Prism.highlightAll();
            setupCopyButtons();
        } else {
            loading.innerText = "Chưa có bài đăng nào.";
        }
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        loading.innerText = "Lỗi kết nối tới cơ sở dữ liệu!";
    }
});

function setupCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const codeToCopy = decodeURIComponent(this.getAttribute("data-content"));
            
            navigator.clipboard.writeText(codeToCopy).then(() => {
                const originalText = this.innerText;
                this.innerText = "Đã Copy!";
                this.classList.add("copied");
                setTimeout(() => {
                    this.innerText = originalText;
                    this.classList.remove("copied");
                }, 2000);
            });
        });
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}
