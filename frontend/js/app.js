// 格式化數字
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 格式化價格
function formatPrice(price) {
    return price.toFixed(2);
}

// 格式化漲跌幅
function formatChange(change) {
    return change.toFixed(2);
}

// 格式化漲跌幅百分比
function formatChangePercent(percent) {
    return percent.toFixed(2) + '%';
}

// 更新股票資訊顯示
function updateStockInfo(data) {
    if (!data) {
        alert('無法獲取股票資訊');
        return;
    }

    // 更新基本資訊
    document.getElementById('stockName').textContent = data.name;
    document.getElementById('stockSymbol').textContent = data.symbol;

    // 更新價格資訊
    document.getElementById('currentPrice').textContent = formatPrice(data.current_price);
    
    // 更新漲跌資訊
    const changeElement = document.getElementById('priceChange');
    const changePercentElement = document.getElementById('priceChangePercent');
    
    changeElement.textContent = formatChange(data.change);
    changePercentElement.textContent = formatChangePercent(data.change_percent);
    
    // 設置漲跌顏色
    if (data.change > 0) {
        changeElement.className = 'change positive';
        changePercentElement.className = 'change positive';
    } else if (data.change < 0) {
        changeElement.className = 'change negative';
        changePercentElement.className = 'change negative';
    } else {
        changeElement.className = 'change';
        changePercentElement.className = 'change';
    }

    // 更新其他價格資訊
    document.getElementById('openPrice').textContent = formatPrice(data.open);
    document.getElementById('highPrice').textContent = formatPrice(data.high);
    document.getElementById('lowPrice').textContent = formatPrice(data.low);
    document.getElementById('prevClose').textContent = formatPrice(data.prev_close);

    // 更新成交資訊
    document.getElementById('volume').textContent = formatNumber(data.volume);
    document.getElementById('amount').textContent = formatNumber(data.amount);

    // 更新時間
    document.getElementById('updateTime').textContent = data.time;
}

// 獲取股票價格
async function getStockPrice() {
    const stockCode = document.getElementById('stockCode').value.trim();
    
    if (!stockCode) {
        alert('請輸入股票代碼');
        return;
    }

    try {
        const response = await fetch(`http://localhost:5001/api/stock/${stockCode}`);
        if (!response.ok) {
            throw new Error('獲取股票資訊失敗');
        }
        
        const data = await response.json();
        updateStockInfo(data);
    } catch (error) {
        console.error('Error:', error);
        alert('獲取股票資訊時發生錯誤');
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 添加輸入框回車事件
    document.getElementById('stockCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getStockPrice();
        }
    });
});

function enterSystem() {
    // 添加過渡效果
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 1s ease';
    
    // 1秒後跳轉到交易頁面
    setTimeout(() => {
        window.location.href = 'trading.html';
    }, 1000);
}

// 交易模態框相關變數
let currentStockCode = '';
let currentStockName = '';
let currentPrice = 0;
let isBuying = true;

// 顯示買入模態框
function showBuyModal(stockCode) {
    isBuying = true;
    currentStockCode = stockCode;
    const stockCard = document.querySelector(`.stock-card:has(.stock-code:contains("${stockCode}"))`);
    currentStockName = stockCard.querySelector('h3').textContent;
    currentPrice = parseFloat(stockCard.querySelector('.current-price').textContent.replace('$', ''));
    
    document.getElementById('modalTitle').textContent = '買入股票';
    document.getElementById('modalStockName').textContent = currentStockName;
    document.getElementById('modalStockCode').textContent = currentStockCode;
    document.getElementById('modalCurrentPrice').textContent = `$${currentPrice.toFixed(2)}`;
    document.getElementById('tradeAmount').value = '1';
    updateTotalAmount();
    
    document.getElementById('tradeModal').style.display = 'block';
}

// 顯示賣出模態框
function showSellModal(stockCode) {
    isBuying = false;
    currentStockCode = stockCode;
    const stockCard = document.querySelector(`.stock-card:has(.stock-code:contains("${stockCode}"))`);
    currentStockName = stockCard.querySelector('h3').textContent;
    currentPrice = parseFloat(stockCard.querySelector('.current-price').textContent.replace('$', ''));
    
    document.getElementById('modalTitle').textContent = '賣出股票';
    document.getElementById('modalStockName').textContent = currentStockName;
    document.getElementById('modalStockCode').textContent = currentStockCode;
    document.getElementById('modalCurrentPrice').textContent = `$${currentPrice.toFixed(2)}`;
    document.getElementById('tradeAmount').value = '1';
    updateTotalAmount();
    
    document.getElementById('tradeModal').style.display = 'block';
}

// 更新總金額
function updateTotalAmount() {
    const amount = parseInt(document.getElementById('tradeAmount').value) || 0;
    const total = amount * currentPrice;
    document.getElementById('modalTotalAmount').textContent = `$${total.toFixed(2)}`;
}

// 關閉模態框
function closeModal() {
    document.getElementById('tradeModal').style.display = 'none';
}

// 確認交易
function confirmTrade() {
    const amount = parseInt(document.getElementById('tradeAmount').value) || 0;
    if (amount <= 0) {
        alert('請輸入有效的數量');
        return;
    }
    
    const action = isBuying ? '買入' : '賣出';
    const total = amount * currentPrice;
    
    // 這裡可以添加實際的交易邏輯
    alert(`${action} ${currentStockName}(${currentStockCode}) ${amount} 股，總金額：$${total.toFixed(2)}`);
    closeModal();
}

// 股票列表
const stockList = [
    // 半導體類
    { code: '2330', name: '台積電' },
    { code: '2454', name: '聯發科' },
    { code: '2303', name: '聯電' },
    { code: '2379', name: '瑞昱' },
    { code: '2449', name: '京元電子' },
    
    // 電子製造類
    { code: '2317', name: '鴻海' },
    { code: '4938', name: '和碩' },
    { code: '2354', name: '鴻準' },
    { code: '2382', name: '廣達' },
    { code: '2308', name: '台達電' },
    
    // 金融類
    { code: '2882', name: '國泰金' },
    { code: '2881', name: '富邦金' },
    { code: '2884', name: '玉山金' },
    { code: '2885', name: '元大金' },
    { code: '2886', name: '兆豐金' },
    
    // 傳產類
    { code: '1301', name: '台塑' },
    { code: '1303', name: '南亞' },
    { code: '2002', name: '中鋼' },
    { code: '1326', name: '台化' },
    { code: '2603', name: '長榮' },
    
    // 其他類
    { code: '2412', name: '中華電' },
    { code: '3008', name: '大立光' },
    { code: '2912', name: '統一超' },
    { code: '2357', name: '華碩' },
    { code: '2474', name: '可成' }
];

// 生成股票卡片 HTML
function generateStockCard(stock) {
    return `
        <div class="stock-card" data-code="${stock.code}" onclick="showStockDetail('${stock.code}')">
            <div class="stock-header">
                <h3>${stock.name}</h3>
                <span class="stock-code">${stock.code}</span>
            </div>
            <div class="stock-price">
                <span class="current-price">--</span>
                <span class="price-change">--</span>
            </div>
            <div class="stock-actions">
                <button class="buy-btn" onclick="event.stopPropagation(); showBuyModal('${stock.code}')">買入</button>
                <button class="sell-btn" onclick="event.stopPropagation(); showSellModal('${stock.code}')">賣出</button>
            </div>
        </div>
    `;
}

// 初始化股票列表
function initializeStockList() {
    const stockListContainer = document.querySelector('.stock-list');
    stockListContainer.innerHTML = stockList.map(generateStockCard).join('');
}

// 獲取股票資訊
async function getStockInfo(stockCode) {
    try {
        const response = await fetch(`http://localhost:5001/api/stock/${stockCode}`);
        if (!response.ok) {
            throw new Error('獲取股票資訊失敗');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// 更新股票卡片
function updateStockCard(card, data) {
    if (!data) return;

    const priceChange = data.change;
    const changePercent = data.change_percent;
    
    card.querySelector('.current-price').textContent = `$${data.current_price.toFixed(2)}`;
    
    const priceChangeElement = card.querySelector('.price-change');
    priceChangeElement.textContent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
    priceChangeElement.className = `price-change ${priceChange >= 0 ? 'positive' : 'negative'}`;
}

// 更新所有股票資訊
async function updateAllStocks() {
    const stockCards = document.querySelectorAll('.stock-card');
    
    for (const card of stockCards) {
        const stockCode = card.querySelector('.stock-code').textContent;
        const data = await getStockInfo(stockCode);
        updateStockCard(card, data);
    }
}

// 搜索股票
async function searchStock() {
    const searchInput = document.getElementById('stockSearch').value.trim();
    if (!searchInput) {
        alert('請輸入股票代碼');
        return;
    }
    
    const data = await getStockInfo(searchInput);
    if (data) {
        // 檢查股票是否已存在
        const existingCard = document.querySelector(`.stock-card:has(.stock-code:contains("${searchInput}"))`);
        if (!existingCard) {
            // 如果找到股票，創建新的股票卡片
            const stockList = document.querySelector('.stock-list');
            const card = document.createElement('div');
            card.className = 'stock-card';
            card.innerHTML = generateStockCard({ code: searchInput, name: data.name });
            stockList.appendChild(card);
            updateStockCard(card, data);
        } else {
            alert('該股票已在列表中');
        }
    } else {
        alert('找不到該股票');
    }
}

// 獲取股票詳細資訊
async function getStockDetail(stockCode) {
    try {
        const response = await fetch(`http://localhost:5001/api/stock/${stockCode}`);
        if (!response.ok) {
            throw new Error('獲取股票詳細資訊失敗');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// 顯示股票詳細資訊模態框
async function showStockDetail(stockCode) {
    console.log('Showing detail for stock:', stockCode);
    const detailModal = document.getElementById('stockDetailModal');
    const data = await getStockDetail(stockCode);
    
    if (data) {
        // 更新模態框內容
        document.querySelector('.stock-detail-name').textContent = data.name;
        document.querySelector('.stock-detail-code').textContent = data.symbol;
        document.querySelector('.stock-detail-time').textContent = `更新時間: ${data.time}`;
        
        // 更新價格資訊
        document.querySelector('.stock-detail-current').textContent = `$${data.current_price.toFixed(2)}`;
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.change_percent >= 0 ? '+' : ''}${data.change_percent.toFixed(2)}%)`;
        const detailChange = document.querySelector('.stock-detail-change');
        detailChange.textContent = changeText;
        detailChange.className = `stock-detail-change ${data.change >= 0 ? 'positive' : 'negative'}`;
        
        // 更新詳細資訊
        document.getElementById('openPrice').textContent = `$${data.open.toFixed(2)}`;
        document.getElementById('prevClose').textContent = `$${data.prev_close.toFixed(2)}`;
        document.getElementById('highPrice').textContent = `$${data.high.toFixed(2)}`;
        document.getElementById('lowPrice').textContent = `$${data.low.toFixed(2)}`;
        document.getElementById('volume').textContent = data.volume.toLocaleString();
        document.getElementById('amount').textContent = `$${(data.amount).toLocaleString()}`;
        
        // 設置買賣按鈕事件
        const buyBtn = detailModal.querySelector('.detail-buy-btn');
        const sellBtn = detailModal.querySelector('.detail-sell-btn');
        
        buyBtn.onclick = () => {
            detailModal.style.display = 'none';
            showBuyModal(stockCode);
        };
        
        sellBtn.onclick = () => {
            detailModal.style.display = 'none';
            showSellModal(stockCode);
        };

        // 顯示模態框
        detailModal.style.display = 'block';
    } else {
        console.error('無法獲取股票詳細資訊');
    }
}

// 初始化事件監聽器
document.addEventListener('DOMContentLoaded', () => {
    // 初始化股票列表
    initializeStockList();
    
    // 更新所有股票資訊
    updateAllStocks();
    
    // 每 30 秒更新一次股票資訊
    setInterval(updateAllStocks, 30000);
    
    // 模態框關閉按鈕
    document.querySelector('.close').addEventListener('click', closeModal);
    
    // 點擊模態框外部關閉
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('tradeModal')) {
            closeModal();
        }
    });
    
    // 交易數量輸入監聽
    document.getElementById('tradeAmount').addEventListener('input', updateTotalAmount);
    
    // 確認交易按鈕
    document.getElementById('confirmTrade').addEventListener('click', confirmTrade);
    
    // 搜索框回車事件
    document.getElementById('stockSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchStock();
        }
    });
    
    // 添加詳細資訊模態框關閉事件
    const detailModal = document.getElementById('stockDetailModal');
    const detailClose = document.querySelector('.detail-close');
    const mainPage = document.getElementById('.nav-brand');

    mainPage.addEventListener('click', () => {
        
    });
    
    detailClose.onclick = () => {
        detailModal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === detailModal) {
            detailModal.style.display = 'none';
        }
    };
}); 