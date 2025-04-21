import requests
from typing import List, Dict, Optional
from datetime import datetime
import logging
import json
import asyncio
import re

class TWSEDataSource:
    """台灣證交所數據源"""
    
    BASE_URL = "https://www.twse.com.tw/exchangeReport"
    REALTIME_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp"
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def _parse_price(self, price_str: str) -> float:
        """解析價格字符串，處理特殊格式"""
        try:
            if not price_str or price_str == '-':
                return 0.0
                
            # 處理多個價格的情況，取最後一個有效價格
            if '_' in price_str:
                # 移除末尾的 '_' 並分割
                prices = price_str.rstrip('_').split('_')
                # 過濾掉空值和無效值
                valid_prices = [p for p in prices if p and p != '-']
                if valid_prices:
                    # 取最後一個有效價格
                    return float(valid_prices[-1])
                return 0.0
                
            return float(price_str)
        except (ValueError, TypeError) as e:
            self.logger.warning(f"價格解析失敗: {price_str}, 錯誤: {e}")
            return 0.0
    
    def _parse_date(self, date_str: str) -> datetime:
        """解析民國年日期格式"""
        try:
            # 處理民國年格式 (e.g., "113/01/02")
            year, month, day = map(int, date_str.split('/'))
            # 轉換民國年為西元年
            year += 1911
            return datetime(year, month, day)
        except (ValueError, TypeError):
            return datetime.now()
    
    async def get_stock_price(self, stock_code: str) -> Optional[Dict]:
        """
        從證交所獲取股票即時價格
        """
        try:
            # 構建股票代碼格式：tse_股票代碼.tw
            formatted_code = f"tse_{stock_code}.tw"
            
            # 發送請求
            response = self.session.get(
                self.REALTIME_URL,
                params={'ex_ch': formatted_code}
            )
            response.raise_for_status()
            
            # 解析響應
            data = response.json()
            if data['rtcode'] == '0000' and data['msgArray']:
                stock_info = data['msgArray'][0]
                
                # 獲取基本價格信息
                current_price = float(stock_info.get('z', '0'))
                prev_close = float(stock_info.get('y', '0'))
                high = float(stock_info.get('h', '0'))
                low = float(stock_info.get('l', '0'))
                open_price = float(stock_info.get('o', '0'))
                
                # 計算漲跌和漲跌幅
                change = current_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                
                # 處理成交量和成交金額
                volume = int(stock_info.get('v', '0').replace(',', '')) if stock_info.get('v') else 0
                amount = int(stock_info.get('tv', '0').replace(',', '')) if stock_info.get('tv') else 0
                
                return {
                    'symbol': stock_code,
                    'name': stock_info.get('n', ''),
                    'current_price': current_price,
                    'change': change,
                    'change_percent': change_percent,
                    'volume': volume,
                    'amount': amount,
                    'high': high,
                    'low': low,
                    'open': open_price,
                    'prev_close': prev_close,
                    'time': stock_info.get('t', '')
                }
            return None
        except Exception as e:
            self.logger.error(f"從證交所獲取股票價格失敗: {e}")
            return None
    
    async def get_historical_data(
        self, 
        stock_code: str, 
        start_date: str, 
        end_date: str
    ) -> List[Dict]:
        """
        獲取歷史交易數據
        start_date 和 end_date 格式：YYYYMMDD
        """
        try:
            # 構建請求參數
            params = {
                'response': 'json',
                'date': start_date,
                'stockNo': stock_code
            }
            
            # 發送請求
            response = self.session.get(
                f"{self.BASE_URL}/STOCK_DAY",
                params=params
            )
            response.raise_for_status()
            
            # 解析響應
            data = response.json()
            if data['stat'] == 'OK':
                return [
                    {
                        'date': self._parse_date(item[0]),
                        'open_price': float(item[3].replace(',', '')) if item[3] else 0,
                        'high_price': float(item[4].replace(',', '')) if item[4] else 0,
                        'low_price': float(item[5].replace(',', '')) if item[5] else 0,
                        'close_price': float(item[6].replace(',', '')) if item[6] else 0,
                        'volume': int(item[1].replace(',', '')) if item[1] else 0,
                        'amount': float(item[2].replace(',', '')) if item[2] else 0
                    }
                    for item in data['data']
                ]
            return []
        except Exception as e:
            self.logger.error(f"獲取歷史數據失敗: {e}")
            return []
    
    async def get_stock_list(self) -> List[Dict]:
        """
        獲取上市股票列表
        注意：證交所沒有直接提供股票列表的 API，
        這裡需要從其他來源獲取或使用預定義的列表
        """
        # 這裡可以實現從其他來源獲取股票列表的邏輯
        # 或者使用預定義的熱門股票列表
        popular_stocks = [
            {'symbol': '2330', 'name': '台積電'},
            {'symbol': '2317', 'name': '鴻海'},
            {'symbol': '2454', 'name': '聯發科'},
            {'symbol': '2881', 'name': '富邦金'},
            {'symbol': '2882', 'name': '國泰金'}
        ]
        return popular_stocks

async def main():
    twse = TWSEDataSource()
    
    # 測試獲取即時價格
    price = await twse.get_stock_price('2330')
    print("即時價格:", price)
    
    # 測試獲取歷史數據
   # history = await twse.get_historical_data('2330', '20240101', '20240131')
   # print("歷史數據:", history)
    
    # 測試獲取股票列表
   # stocks = await twse.get_stock_list()
   # print("股票列表:", stocks)

if __name__ == "__main__":
    asyncio.run(main())
