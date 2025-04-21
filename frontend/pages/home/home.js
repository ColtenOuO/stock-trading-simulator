function enterSystem() {
    // 添加淡出效果
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    // 延遲後跳轉到交易頁面
    setTimeout(() => {
        window.location.href = '../trading/trading.html';
    }, 500);
} 