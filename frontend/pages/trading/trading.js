// 股票資料
const stocks = [
    { code: '2330', name: '台積電' },
    { code: '2454', name: '聯發科' },
    { code: '2303', name: '聯電' },
    { code: '2317', name: '鴻海' },
    { code: '4938', name: '和碩' },
    { code: '2882', name: '國泰金' },
    { code: '2881', name: '富邦金' },
    { code: '1301', name: '台塑' },
    { code: '1303', name: '南亞' },
    { code: '2412', name: '中華電' },
    { code: '2308', name: '台達電' },
    { code: '3008', name: '大立光' }
];

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initializeStockList();
    startDataUpdates();
    searchStock()
});

// 股票搜尋
async function searchStock() {
    const searchInput = document.querySelector('.nav-search input');
    const searchButton = document.querySelector('.nav-search button');

    // 處理搜尋按鈕點擊
    searchButton.addEventListener('click', () => handleSearch(searchInput.value));

    // 處理輸入框按下 Enter 鍵
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch(searchInput.value);
        }
    });
}

// 處理搜尋邏輯
async function handleSearch(searchValue) {
    if (!searchValue) {
        alert('請輸入股票代碼');
        return;
    }

    try {
        // 顯示載入中的提示
        const searchButton = document.querySelector('.nav-search button');
        const originalText = searchButton.textContent;
        searchButton.textContent = '搜尋中...';
        searchButton.disabled = true;

        const response = await fetch(`http://localhost:5001/api/stock/${searchValue}`);
        const data = await response.json();

        if (response.status === 200 && data) {
            // 檢查是否已有此股票的卡片
            let existingCard = document.querySelector(`[data-stock-code="${data.symbol}"]`);
            
            if (!existingCard) {
                // 如果沒有現有卡片，創建一個新的
                const newStock = {
                    code: data.symbol,
                    name: data.name
                };
                
                const stockCard = createStockCard(newStock);
                const stockList = document.querySelector('.stock-list');
                stockList.insertBefore(stockCard, stockList.firstChild);
                
                // 添加搜尋結果標記
                stockCard.classList.add('search-result');
                const badge = document.createElement('div');
                badge.className = 'search-result-badge';
                badge.textContent = '最近搜尋';
                stockCard.appendChild(badge);
                
                // 設置 5 秒後移除標記
                setTimeout(() => {
                    stockCard.classList.remove('search-result');
                    badge.remove();
                }, 5000);
                
                // 立即更新新卡片的數據
                updateStockCard(data.symbol, data);
            } else {
                // 如果已有卡片，添加搜尋結果標記
                existingCard.classList.add('search-result');
                const badge = document.createElement('div');
                badge.className = 'search-result-badge';
                badge.textContent = '最近搜尋';
                existingCard.appendChild(badge);
                
                
                // 將現有卡片移到最前面
                const stockList = document.querySelector('.stock-list');
                stockList.insertBefore(existingCard, stockList.firstChild);
            }
            
            // 顯示股票詳細資訊
            showStockDetail(data.symbol, data.name);
            
            // 清空搜尋框
            document.querySelector('.nav-search input').value = '';
        } else {
            alert('找不到該股票，請確認股票代碼是否正確');
        }
    } catch (error) {
        console.error('搜尋股票時發生錯誤:', error);
        alert('搜尋股票時發生錯誤，請稍後再試');
    } finally {
        // 恢復按鈕狀態
        const searchButton = document.querySelector('.nav-search button');
        searchButton.textContent = '搜尋';
        searchButton.disabled = false;
    }
}

// 初始化股票列表
function initializeStockList() {
    const stockList = document.querySelector('.stock-list');
    stocks.forEach(stock => {
        const stockCard = createStockCard(stock);
        stockList.appendChild(stockCard);
    });
}

// 創建股票卡片
function createStockCard(stock) {
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.dataset.stockCode = stock.code;
    card.innerHTML = `
        <div class="stock-header">
            <h3>${stock.name}</h3>
            <span class="stock-code">${stock.code}</span>
        </div>
        <div class="stock-price">
            <div class="current-price">--</div>
            <div class="price-change">--</div>
        </div>
        <div class="stock-actions">
            <button class="buy-btn" onclick="showTradeModal('${stock.code}', '${stock.name}', 'buy')">買入</button>
            <button class="sell-btn" onclick="showTradeModal('${stock.code}', '${stock.name}', 'sell')">賣出</button>
        </div>
    `;
    
    // 添加點擊事件顯示詳細資料
    card.addEventListener('click', (e) => {
        // 如果點擊的是按鈕，不顯示詳細資料
        if (!e.target.closest('.stock-actions')) {
            showStockDetail(stock.code, stock.name);
        }
    });
    
    return card;
}

// 更新股票資料
async function updateStockData() {
    for (const stock of stocks) {
        try {
            const response = await fetch(`http://localhost:5001/api/stock/${stock.code}`);
            const data = await response.json();
            updateStockCard(stock.code, data);
        } catch (error) {
            console.error(`更新股票 ${stock.code} 資料失敗:`, error);
        }
    }
}

// 更新股票卡片
function updateStockCard(stockCode, data) {
    const card = document.querySelector(`[data-stock-code="${stockCode}"]`);
    if (!card) return;

    const priceElement = card.querySelector('.current-price');
    const changeElement = card.querySelector('.price-change');

    if (!data || !data.current_price) {
        priceElement.textContent = '--';
        changeElement.textContent = '--';
        changeElement.className = 'price-change';
        console.log(`股票 ${stockCode} 數據無效:`, data);
        return;
    }

    // 計算漲跌幅
    const currentPrice = Number(data.current_price);
    const previousClose = Number(data.prev_close);
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // 更新價格
    priceElement.textContent = `$${currentPrice.toFixed(2)}`;
    
    // 更新漲跌幅
    const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
    changeElement.textContent = changeText;
    changeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;

    // 保存詳細數據到卡片元素中
    card.dataset.stockData = JSON.stringify(data);
}

// 更新圖表
async function updateChart(stockCode, period) {
    try {
        console.log('更新圖表:', stockCode, period);
        
        // 更新按鈕狀態
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.chart-btn[onclick*="${period}"]`).classList.add('active');

        // 獲取歷史數據
        const response = await fetch(`http://localhost:5001/api/stock/${stockCode}/history?period=${period}`);
        const data = await response.json();
        console.log('獲取到的數據:', data);

        if (!data || data.length === 0) {
            console.error('沒有數據可顯示');
            return;
        }

        // 準備圖表數據
        const chartData = {
            labels: data.map(item => item.time),
            datasets: [{
                label: '股價',
                data: data.map(item => item.price),
                borderColor: '#00fffc',
                backgroundColor: 'rgba(0, 255, 252, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        };

        // 圖表配置
        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#00fffc',
                        borderColor: '#00fffc',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff',
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff',
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        };

        // 銷毀舊圖表（如果存在）
        const chartCanvas = document.getElementById('stockChart');
        const existingChart = Chart.getChart(chartCanvas);
        if (existingChart) {
            console.log('銷毀舊圖表');
            existingChart.destroy();
        }

        // 創建新圖表
        console.log('創建新圖表');
        new Chart(chartCanvas, config);

    } catch (error) {
        console.error('更新圖表失敗:', error);
    }
}

function showStockDetail(stockCode, stockName) {
    const card = document.querySelector(`[data-stock-code="${stockCode}"]`);
    const data = JSON.parse(card.dataset.stockData || '{}');
    console.log('股票數據:', data);
    
    const detailModal = document.getElementById('detailModal');
    const modalContent = detailModal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <span class="close" onclick="closeDetailModal()">&times;</span>
        <div class="stock-detail-header">
            <div class="stock-detail-name">${stockName}</div>
            <div class="stock-detail-code">${stockCode}</div>
        </div>
        <div class="stock-detail-price">
            <div class="stock-detail-current">$${Number(data.current_price).toFixed(2)}</div>
            <div class="stock-detail-change ${Number(data.current_price) >= Number(data.prev_close) ? 'positive' : 'negative'}">
                ${calculatePriceChange(data.current_price, data.prev_close)}
            </div>
        </div>
        <div class="stock-detail-grid">
            <div class="detail-item">
                <div class="detail-label">開盤價</div>
                <div class="detail-value">$${Number(data.open || 0).toFixed(2)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">最高價</div>
                <div class="detail-value">$${Number(data.high || 0).toFixed(2)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">最低價</div>
                <div class="detail-value">$${Number(data.low || 0).toFixed(2)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">昨收價</div>
                <div class="detail-value">$${Number(data.prev_close || 0).toFixed(2)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">成交量</div>
                <div class="detail-value">${Number(data.volume || 0).toLocaleString()}</div>
            </div>
        </div>
        <div class="chart-controls">
            <button class="chart-btn active" onclick="updateChart('${stockCode}', '1d')">日線</button>
            <button class="chart-btn" onclick="updateChart('${stockCode}', '1w')">週線</button>
            <button class="chart-btn" onclick="updateChart('${stockCode}', '1m')">月線</button>
        </div>
        <div class="detail-chart">
            <canvas id="stockChart"></canvas>
        </div>
        <div class="detail-actions">
            <button class="detail-buy-btn" onclick="showTradeModal('${stockCode}', '${stockName}', 'buy')">買入</button>
            <button class="detail-sell-btn" onclick="showTradeModal('${stockCode}', '${stockName}', 'sell')">賣出</button>
        </div>
    `;
    
    detailModal.style.display = 'block';
    
    setTimeout(() => {
        updateChart(stockCode, '1d');
    }, 100);
}

// 計算價格變動
function calculatePriceChange(current, previous) {
    if (!current || !previous) return '--';
    const change = Number(current) - Number(previous);
    const changePercent = (change / Number(previous)) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
}

// 關閉詳細資料模態框
function closeDetailModal() {
    const detailModal = document.getElementById('detailModal');
    detailModal.style.display = 'none';
}

// 開始定期更新數據
function startDataUpdates() {
    updateStockData();
    setInterval(updateStockData, 30000);
}

// 顯示交易模態框
function showTradeModal(stockCode, stockName, action) {
    closeDetailModal()
    const modal = document.getElementById('tradeModal');
    const modalTitle = modal.querySelector('.modal-title');
    const actionText = action === 'buy' ? '買入' : '賣出';
    
    modalTitle.textContent = `${actionText} ${stockName} (${stockCode})`;
    modal.setAttribute('data-stock-code', stockCode);
    modal.setAttribute('data-action', action);
    
    // 重置輸入框和總金額
    const quantityInput = document.getElementById('quantity');
    const totalAmount = document.getElementById('totalAmount');
    quantityInput.value = '';
    totalAmount.textContent = '$0.00';
    
    // 更新總金額顯示
    quantityInput.addEventListener('input', () => {
        const card = document.querySelector(`[data-stock-code="${stockCode}"]`);
        const stockData = JSON.parse(card.dataset.stockData || '{}');
        const price = Number(stockData.current_price);
        const quantity = Number(quantityInput.value) || 0;
        const total = price * quantity;
        totalAmount.textContent = `$${total.toFixed(2)}`;
    });

    // 設置確認按鈕點擊事件
    const confirmBtn = modal.querySelector('.confirm-btn');
    confirmBtn.onclick = async () => {
        const quantity = Number(quantityInput.value);  
        if (!quantity || quantity <= 0) {
            alert('請輸入有效的數量');
            return;
        }
        
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                alert('請先登入');
                return;
            }
            
            // 加入除錯資訊
            console.log('Token:', token);
            
            const response = await fetch(`http://localhost:5001/api/trading/buy?symbol=${stockCode}&quantity=${quantity}&token=${token}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API 錯誤:', errorData);
                throw new Error(errorData.detail || '交易失敗');
            }
            
            const data = await response.json();
            alert('交易成功！');
            closeModal();
            // 更新用戶餘額
            updateUserBalance();
            // 更新投資組合
            updatePortfolio();
        } catch (error) {
            console.error('交易時發生錯誤:', error);
            alert(error.message || '交易時發生錯誤，請稍後再試');
        }
    };
    
    modal.style.display = 'block';
}

// 關閉交易模態框
function closeModal() {
    const modal = document.getElementById('tradeModal');
    modal.style.display = 'none';
}

// 當點擊模態框外部時關閉
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// 顯示投資組合
function showPortfolio() {
    const portfolioModal = document.getElementById('portfolioModal');
    portfolioModal.style.display = 'block';
    
    // 更新持倉和交易記錄
    updatePortfolio();
    updateTransactions();
}

// 關閉投資組合模態框
function closePortfolioModal() {
    const portfolioModal = document.getElementById('portfolioModal');
    portfolioModal.style.display = 'none';
}

// 切換投資組合標籤頁
function switchPortfolioTab(tab) {
    const holdingsTable = document.getElementById('holdingsTable');
    const historyTable = document.getElementById('historyTable');
    const buttons = document.querySelectorAll('.tab-btn');
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tab === 'holdings') {
        holdingsTable.classList.remove('hidden');
        historyTable.classList.add('hidden');
        document.querySelector('.tab-btn[onclick*="holdings"]').classList.add('active');
    } else {
        holdingsTable.classList.add('hidden');
        historyTable.classList.remove('hidden');
        document.querySelector('.tab-btn[onclick*="history"]').classList.add('active');
    }
}

// 顯示個人資料
function showProfile() {
    // TODO: 實現個人資料顯示邏輯
    alert('即將推出：個人資料');
}

// 檢查登入狀態
async function checkLoginStatus() {
    try {
        console.log('開始檢查登入狀態...');
        
        // 從 URL 獲取 token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            // 如果 URL 中有 token，存到 localStorage
            localStorage.setItem('auth_token', token);
            // 清除 URL 中的 token
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // 從 localStorage 獲取 token
        const storedToken = localStorage.getItem('auth_token');
        
        if (!storedToken) {
            throw new Error('未找到 token');
        }
        
        // 發送請求到後端驗證端點
        const response = await fetch('http://127.0.0.1:5001/api/auth/verify', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${storedToken}`
            }
        });

        console.log('收到回應:', response.status);
        const data = await response.json();
        console.log('回應數據:', data);
        
        // 更新用戶界面
        if (data.status === 'success' && data.user_data) {
            const userData = data.user_data;
            console.log('用戶數據:', userData);
            
            document.getElementById('username').textContent = userData.username || '未知用戶';
            if (userData.avatar) {
                document.getElementById('userAvatar').src = 
                    `https://cdn.discordapp.com/avatars/${userData.user_id}/${userData.avatar}.png`;
            } else {
                document.getElementById('userAvatar').src = 
                    'https://cdn.discordapp.com/embed/avatars/0.png';
            }
            document.getElementById('userAvatar').style.display = 'block';
            document.querySelector('.user-info').style.display = 'flex';
            
            // 格式化並顯示餘額
            const balance = userData.balance || 1000000; // 預設 100 萬
            document.getElementById('userBalance').textContent = 
                new Intl.NumberFormat('zh-TW', {
                    style: 'currency',
                    currency: 'TWD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(balance);
            document.querySelector('.balance-info').style.display = 'flex';
        } else {
            console.log('未登入或驗證失敗:', data.message);
            document.getElementById('username').textContent = '遊客模式';
            document.getElementById('userAvatar').style.display = 'none';
            document.querySelector('.user-info').style.display = 'none';
            document.querySelector('.balance-info').style.display = 'none';
            // 如果未登入，重定向到首頁
            window.location.href = '../home/index.html';
        }
        
    } catch (error) {
        console.error('登入狀態檢查失敗:', error);
        document.getElementById('username').textContent = '遊客模式';
        document.getElementById('userAvatar').style.display = 'none';
        document.querySelector('.user-info').style.display = 'none';
        document.querySelector('.balance-info').style.display = 'none';
        window.location.href = '../home/index.html';
    }
}

// 登出功能
async function logout() {
    if (confirm('確定要登出嗎？')) {
        try {
            localStorage.removeItem('auth_token');
            window.location.href = '../home/index.html';
        } catch (error) {
            console.error('登出失敗:', error);
            alert('登出時發生錯誤，請稍後再試');
        }
    }
}

// 更新用戶餘額
async function updateUserBalance() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const response = await fetch('http://localhost:5001/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user_data && data.user_data.balance) {
                const balanceElement = document.getElementById('userBalance');
                balanceElement.textContent = new Intl.NumberFormat('zh-TW', {
                    style: 'currency',
                    currency: 'TWD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(data.user_data.balance);
            }
        }
    } catch (error) {
        console.error('更新餘額時發生錯誤:', error);
    }
}

// 更新投資組合
async function updatePortfolio() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const response = await fetch(`http://localhost:5001/api/trading/portfolio?token=${token}`);
        
        if (response.ok) {
            const data = await response.json();
            updatePortfolioDisplay(data.portfolio);
        }
    } catch (error) {
        console.error('更新投資組合時發生錯誤:', error);
    }
}

// 更新交易記錄
async function updateTransactions() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.log('未找到 token');
            return;
        }
        
        const response = await fetch(`http://localhost:5001/api/trading/transactions?token=${token}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('獲取到的交易記錄:', data);
            
            // 檢查數據格式並取得 transactions 陣列
            if (data && data.transactions) {
                updateTransactionsDisplay(data.transactions);
            } else {
                console.error('交易記錄數據格式不正確:', data);
            }
        } else {
            console.error('獲取交易記錄失敗:', response.status);
        }
    } catch (error) {
        console.error('更新交易記錄時發生錯誤:', error);
    }
}

// 更新持倉顯示
function updatePortfolioDisplay(portfolio) {
    const holdingsTableBody = document.getElementById('holdingsTableBody');
    holdingsTableBody.innerHTML = '';
    
    let totalValue = 0;
    let totalCost = 0;
    
    portfolio.forEach(item => {
        const row = document.createElement('tr');
        const currentPrice = parseFloat(item.current_price || 0);
        const quantity = parseInt(item.quantity || 0);
        const cost = parseFloat(item.average_cost || 0);
        const value = currentPrice * quantity;
        const profit = value - (cost * quantity);
        const profitPercentage = cost > 0 ? (profit / (cost * quantity)) * 100 : 0;
        
        totalValue += value;
        totalCost += cost * quantity;
        
        row.innerHTML = `
            <td>${item.stock_id}</td>
            <td>${item.stock_name || '未知'}</td>
            <td>${quantity.toLocaleString()}</td>
            <td>$${currentPrice.toFixed(2)}</td>
            <td>$${value.toFixed(2)}</td>
            <td class="${profit >= 0 ? 'positive' : 'negative'}">${profitPercentage.toFixed(2)}%</td>
        `;
        
        holdingsTableBody.appendChild(row);
    });
    
    // 更新總計
    const totalProfit = totalValue - totalCost;
    const totalProfitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    
    document.getElementById('totalAssets').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('holdingValue').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('cashBalance').textContent = `$${parseFloat(document.getElementById('userBalance').textContent.replace('$', '')).toFixed(2)}`;
    document.getElementById('totalProfit').textContent = `${totalProfitPercentage.toFixed(2)}%`;
}

// 更新交易記錄顯示
async function updateTransactionsDisplay(transactions) {
    const historyTableBody = document.getElementById('historyTableBody');
    historyTableBody.innerHTML = '';
    
    console.log('開始更新交易記錄顯示:', transactions);
    
    // 檢查是否有交易記錄
    if (!transactions || !transactions.history) {
        console.log('沒有交易記錄');
        return;
    }

    // 獲取交易歷史
    const transactionHistory = transactions.history;
    console.log('交易歷史:', transactionHistory);
    
    if (!transactionHistory || transactionHistory.length === 0) {
        console.log('沒有交易歷史');
        return;
    }
    
    // 按時間戳排序（從新到舊）
    transactionHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    for (const record of transactionHistory) {
        console.log('處理交易記錄:', record);
        const row = document.createElement('tr');
        const type = record.type === 'buy' ? '買入' : '賣出';
        const quantity = parseInt(record.quantity || 0);
        const price = parseFloat(record.price || 0);
        const total = parseFloat(record.total_amount || 0);
        
        // 將 UTC 時間轉換為 UTC+8
        const utcDate = new Date(record.timestamp);
        const taipeiDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
        
        // 確保 stock_id 是字串並格式化
        const stockId = String(record.stock_id || '').padStart(4, '0');
        
        try {
            const response = await fetch(`http://localhost:5001/api/stock/${stockId}`);
            if (response.ok) {
                const stock_data = await response.json();
                const stock_name = stock_data.name;
                row.innerHTML = `
                    <td>${taipeiDate.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</td>
                    <td>${stockId}</td>
                    <td>${stock_name || '未知'}</td>
                    <td class="${record.type}">${type}</td>
                    <td>${quantity.toLocaleString()}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                    <td>--</td>
                `;
            } else {
                console.error('獲取股票資料失敗:', response.status);
                row.innerHTML = `
                    <td>${taipeiDate.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</td>
                    <td>${stockId}</td>
                    <td>未知</td>
                    <td class="${record.type}">${type}</td>
                    <td>${quantity.toLocaleString()}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                    <td>--</td>
                `;
            }
        } catch (error) {
            console.error('獲取股票資料時發生錯誤:', error);
            row.innerHTML = `
                <td>${taipeiDate.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</td>
                <td>${stockId}</td>
                <td>未知</td>
                <td class="${record.type}">${type}</td>
                <td>${quantity.toLocaleString()}</td>
                <td>$${price.toFixed(2)}</td>
                <td>$${total.toFixed(2)}</td>
                <td>--</td>
            `;
        }
        
        historyTableBody.appendChild(row);
    }
} 